"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * CodeBlock — a framed wire sample. Mono, tabular, with a copy affordance. The
 * `caption` rides the top bar like a file header so a reader knows what they're
 * looking at (a packet, a firmware sketch, a CoT event).
 */
export function CodeBlock({
  caption,
  code,
  lang = "json",
}: {
  caption: string;
  code: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (insecure context) — silently no-op */
    }
  }

  return (
    <figure className="w-full min-w-0 overflow-hidden rounded-tac border border-tac-line bg-tac-bg">
      <figcaption className="flex items-center justify-between border-b border-tac-line bg-tac-panel/60 px-3 py-2">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">
          {caption}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copiado" : "Copiar al portapapeles"}
          className="flex items-center gap-1.5 rounded-tac px-2 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted transition-colors hover:text-tac-accent focus-visible:text-tac-accent focus-visible:outline-none"
        >
          {copied ? (
            <Check className="size-3 text-tac-accent" strokeWidth={2.5} />
          ) : (
            <Copy className="size-3" strokeWidth={2} />
          )}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3.5 text-[0.78rem] leading-relaxed">
        <code
          className="font-mono text-tac-text [font-feature-settings:'liga'_0,'calt'_0] [font-variant-numeric:tabular-nums]"
          data-lang={lang}
        >
          {code}
        </code>
      </pre>
    </figure>
  );
}
