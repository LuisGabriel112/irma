import type { ReactNode } from "react";
import { cn } from "@/lib/util/cn";

/**
 * Landing primitives — the landing speaks IRMA's own UI grammar instead of a
 * generic marketing kit. These are the same shapes the app uses: status chips,
 * glowing affiliation dots, translucent hairline-bordered panels, mono spec
 * rows. Explaining the instrument by building little pieces of it.
 */

/* A semantic status chip, lifted from the app's status bar. Color is meaning. */
export function Chip({
  icon,
  children,
  tone = "muted",
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "accent" | "warn" | "danger" | "info" | "muted";
}) {
  const tones = {
    accent: "text-tac-accent",
    warn: "text-tac-warn",
    danger: "text-tac-danger",
    info: "text-tac-info",
    muted: "text-tac-muted",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[0.6875rem] font-semibold [font-variant-numeric:tabular-nums]",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* Affiliation / status dot. The glow makes it read as a lit indicator, per the
   app's Status-glow shadow rule. */
export function Dot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
    />
  );
}

/* Structural section label — IRMA's closed-system micro-label (DESIGN.md §3),
   used deliberately, not as an eyebrow on every heading. */
export function Kicker({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "font-mono text-[0.625rem] font-semibold uppercase tracking-[0.18em]",
        tone === "accent" ? "text-tac-accent" : "text-tac-muted",
      )}
    >
      {children}
    </span>
  );
}

/* A translucent panel — the app's chrome surface. Hairline border, backdrop
   blur, no drop shadow on chrome (No-Shadow-Chrome rule). */
export function Panel({
  children,
  className,
  label,
  icon,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-tac border border-tac-line bg-tac-panel/85 backdrop-blur-md",
        className,
      )}
    >
      {label && (
        <div className="flex items-center gap-2 border-b border-tac-line px-3 py-2.5 text-tac-muted">
          {icon}
          <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em]">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

/* A label → mono value row, the workhorse of every readout in the app. */
export function SpecRow({
  label,
  value,
  tone = "text",
}: {
  label: string;
  value: ReactNode;
  tone?: "text" | "accent" | "warn" | "danger" | "info";
}) {
  const tones = {
    text: "text-tac-text",
    accent: "text-tac-accent",
    warn: "text-tac-warn",
    danger: "text-tac-danger",
    info: "text-tac-info",
  } as const;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[0.8125rem] [font-variant-numeric:tabular-nums]",
          tones[tone],
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* Capped-measure prose so body copy never runs past a comfortable reading line. */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-[68ch] text-[0.975rem] leading-relaxed text-tac-text/90 [text-wrap:pretty]",
        className,
      )}
    >
      {children}
    </p>
  );
}
