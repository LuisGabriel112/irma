"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { cn } from "@/lib/util/cn";
import { EmptyState } from "@/components/ui";

export function ChatPanel() {
  const messages = useStore((s) => s.messages);
  const sendMessage = useStore((s) => s.sendMessage);
  const markRead = useStore((s) => s.markRead);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead();
  }, [markRead, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="Sin tráfico">
            Los mensajes se difunden a todas las unidades de la red. Escribe abajo
            para emitir el primero.
          </EmptyState>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex flex-col", m.self ? "items-end" : "items-start")}>
              {!m.self && (
                <span className="mb-0.5 px-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-tac-friend">
                  {m.from}
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-[var(--radius-tac)] px-3 py-1.5 text-sm",
                  m.self
                    ? "bg-tac-accent/15 text-tac-text"
                    : "border border-tac-line bg-tac-panel-2 text-tac-text",
                )}
              >
                {m.text}
              </div>
              <span className="mt-0.5 px-1 text-[10px] tabular-nums text-tac-muted">
                {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-tac-line p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Mensaje a todas las unidades…"
          className="min-w-0 flex-1 rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-3 py-2 text-sm text-tac-text placeholder:text-tac-muted focus:border-tac-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] bg-tac-accent text-black transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-text disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
