"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, ChatMode, InventoryItem } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface ChatAssistantProps {
  inventory: InventoryItem[];
  loading: boolean;
}

const MODE_CONFIG = {
  stagiaire: {
    label: "🎓 Stagiaire",
    placeholder:
      "Décris ton projet électronique et je te dirai quels composants utiliser…",
    color: "indigo",
  },
  technician: {
    label: "🔧 Technicien",
    placeholder:
      "Quel composant cherches-tu ? Je vais vérifier dans l'inventaire…",
    color: "emerald",
  },
} as const;

export default function ChatAssistant({ inventory, loading }: ChatAssistantProps) {
  const [mode, setMode] = useState<ChatMode>("stagiaire");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setIsStreaming(true);

    // Optimistically add a blank assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          mode,
          inventory,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snapshot = full;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: snapshot };
          return updated;
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur : ${message}`);
      setMessages((prev) => prev.slice(0, -1)); // remove blank assistant bubble
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const cfg = MODE_CONFIG[mode];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Mode tabs */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1 font-medium">Mode :</span>
        {(Object.keys(MODE_CONFIG) as ChatMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              mode === m
                ? m === "stagiaire"
                  ? "bg-indigo-600 text-white"
                  : "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {MODE_CONFIG[m].label}
          </button>
        ))}
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Effacer la conversation
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 pb-10">
            <div className="text-5xl mb-4">
              {mode === "stagiaire" ? "🎓" : "🔧"}
            </div>
            <p className="font-medium text-slate-600 mb-1">
              {mode === "stagiaire"
                ? "Mode Stagiaire"
                : "Mode Technicien"}
            </p>
            <p className="text-sm max-w-sm">
              {mode === "stagiaire"
                ? "Décris ton projet et je t'indiquerai les composants disponibles dans l'inventaire avec leurs références et emplacements."
                : "Pose ta question sur un composant spécifique et je vérifierai sa disponibilité dans l'inventaire."}
            </p>
            {loading && (
              <p className="text-xs mt-3 text-amber-500">
                ⏳ Chargement de l'inventaire en cours…
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const streaming = isLast && isStreaming && msg.role === "assistant";
          return (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={streaming}
              inventory={inventory}
            />
          );
        })}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-300 transition-shadow">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || loading}
            placeholder={cfg.placeholder}
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none min-h-[24px]"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || loading}
            className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            title="Envoyer (Entrée)"
          >
            {isStreaming ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 text-center">
          Entrée pour envoyer · Maj+Entrée pour aller à la ligne
        </p>
      </div>
    </div>
  );
}
