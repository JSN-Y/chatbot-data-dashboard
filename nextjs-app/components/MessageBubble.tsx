"use client";

import type { InventoryItem } from "@/lib/types";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  inventory: InventoryItem[];
}

/** Find the column key for component references */
function findRefColumn(items: InventoryItem[]): string {
  const candidates = [
    "Component ref.N",
    "Component Ref.N",
    "Ref",
    "Reference",
    "Part Number",
    "Component",
  ];
  if (!items.length) return "";
  for (const c of candidates) {
    if (items.some((i) => i[c] !== undefined)) return c;
    const key = Object.keys(items[0]).find(
      (k) => k.trim().toLowerCase() === c.toLowerCase()
    );
    if (key) return key;
  }
  return Object.keys(items[0])[0] ?? "";
}

/** Extract component info mentioned in the AI response */
function findMentionedComponents(
  content: string,
  inventory: InventoryItem[]
): { ref: string; datasheet: string }[] {
  if (!inventory.length) return [];
  const refCol = findRefColumn(inventory);
  const datasheetCandidates = ["Datasheet", "Fiche technique", "PDF", "Link"];

  function getDatasheet(item: InventoryItem): string {
    for (const c of datasheetCandidates) {
      if (item[c]?.trim()) return item[c].trim();
      const key = Object.keys(item).find(
        (k) => k.trim().toLowerCase() === c.toLowerCase()
      );
      if (key && item[key]?.trim()) return item[key].trim();
    }
    return "";
  }

  const mentioned: { ref: string; datasheet: string }[] = [];
  const seen = new Set<string>();
  const contentLower = content.toLowerCase();

  for (const item of inventory) {
    const ref = (item[refCol] ?? "").trim();
    if (!ref || ref.length < 2) continue;
    if (seen.has(ref)) continue;
    if (contentLower.includes(ref.toLowerCase())) {
      seen.add(ref);
      mentioned.push({ ref, datasheet: getDatasheet(item) });
    }
  }

  return mentioned;
}

/**
 * Safely render message content as React nodes — NO dangerouslySetInnerHTML.
 * Supports: **bold**, bullet lists (- / * / •), and line breaks.
 */
function SafeContent({ text }: { text: string }) {
  const lines = text.split("\n");

  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList(key: string) {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key} className="list-disc pl-5 mb-1 space-y-0.5">
        {listBuffer.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  lines.forEach((line, lineIdx) => {
    const isBullet = /^[-•*]\s/.test(line);
    if (isBullet) {
      listBuffer.push(line.replace(/^[-•*]\s/, ""));
    } else {
      flushList(`ul-${lineIdx}`);
      if (line.trim() === "") {
        if (lineIdx > 0) nodes.push(<br key={`br-${lineIdx}`} />);
      } else {
        nodes.push(
          <p key={`p-${lineIdx}`} className="mb-1 last:mb-0">
            {renderInline(line)}
          </p>
        );
      }
    }
  });
  flushList("ul-end");

  return <>{nodes}</>;
}

/** Render a single line with inline bold/code markup as React nodes */
function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** and `code` patterns
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-black/10 px-1 py-0.5 rounded text-[0.85em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/** Validate a URL is safe (http/https only) before using it in an href */
function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return url;
    }
  } catch {
    // invalid URL
  }
  return null;
}

export default function MessageBubble({
  role,
  content,
  isStreaming = false,
  inventory,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const mentioned = isUser ? [] : findMentionedComponents(content, inventory);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5`}>
      {/* Avatar (assistant only) */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm shrink-0 mt-0.5 select-none">
          ⚡
        </div>
      )}

      <div
        className={`max-w-[78%] space-y-2 flex flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-sm"
          } ${isStreaming ? "typing-cursor" : ""}`}
        >
          <SafeContent text={content} />
        </div>

        {/* Component buttons — only for assistant messages with recognized refs */}
        {!isUser && mentioned.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {mentioned.map(({ ref, datasheet }) => {
              const pdfHref = safeUrl(datasheet);
              const octoHref = `https://octopart.com/search?q=${encodeURIComponent(ref)}`;
              return (
                <div key={ref} className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    {ref}
                  </span>
                  {pdfHref && (
                    <a
                      href={pdfHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200 transition-colors"
                      title="Fiche technique PDF directe"
                    >
                      📄 PDF Direct
                    </a>
                  )}
                  <a
                    href={octoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-full border border-amber-200 transition-colors"
                    title="Chercher une alternative sur Octopart"
                  >
                    🔍 Alternatif
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Avatar (user only) */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-sm shrink-0 mt-0.5 select-none">
          👤
        </div>
      )}
    </div>
  );
}
