import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPTS = {
  stagiaire:
    "Tu es un mentor en électronique. Le stagiaire t'explique son projet. Dis-lui quels composants de l'inventaire fourni il peut utiliser. Inclus TOUJOURS la référence exacte ('Component ref.N') et l'emplacement physique ('Address'). S'il n'y a pas le composant exact, propose une alternative de la liste. Réponds en français.",
  technician:
    "Tu es un assistant de labo. Un technicien cherche un composant. Vérifie UNIQUEMENT dans l'inventaire fourni. Donne la référence et l'emplacement ('Address'). S'il est absent, propose la meilleure alternative de la liste. Réponds en français de façon concise.",
};

if (!process.env.GROQ_API_KEY) {
  console.warn("[Chat] GROQ_API_KEY is not set — requests will fail.");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      mode,
      inventory,
    }: {
      messages: { role: "user" | "assistant"; content: string }[];
      mode: "stagiaire" | "technician";
      inventory: Record<string, string>[];
    } = body;

    if (!messages || !mode) {
      return NextResponse.json(
        { error: "Missing messages or mode" },
        { status: 400 }
      );
    }

    const systemPromptBase =
      SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.technician;

    // Trim inventory to avoid token overload; send up to 500 items as JSON
    const inventorySnippet = JSON.stringify(
      (inventory ?? []).slice(0, 500),
      null,
      0
    );

    const systemPrompt = `${systemPromptBase}\n\n---\nINVENTAIRE (JSON):\n${inventorySnippet}`;

    // Stream the Groq response back to the client
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.3,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[Chat] Error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
