"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/util/cn";
import { AFFILIATION_COLORS, type Affiliation } from "@/lib/types";

export function Dot({
  affiliation,
  color,
  className,
}: {
  affiliation?: Affiliation;
  color?: string;
  className?: string;
}) {
  const c = color ?? (affiliation ? AFFILIATION_COLORS[affiliation] : "#7d8f86");
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ background: c, boxShadow: `0 0 6px ${c}` }}
    />
  );
}

export function IconButton({
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[var(--radius-tac)] border transition-colors",
        "border-tac-line text-tac-muted hover:text-tac-text hover:border-tac-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent",
        active && "border-tac-accent bg-tac-accent/10 text-tac-accent hover:text-tac-accent",
        "disabled:cursor-not-allowed disabled:opacity-30",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Button({
  variant = "default",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "accent" | "danger" | "ghost";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-tac)] px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variant === "default" &&
          "border border-tac-line text-tac-text hover:border-tac-muted hover:bg-tac-panel-2",
        variant === "accent" && "bg-tac-accent text-black hover:bg-tac-accent/90",
        variant === "danger" && "bg-tac-danger/15 text-tac-danger hover:bg-tac-danger/25",
        variant === "ghost" && "text-tac-muted hover:text-tac-text",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-tac-muted">
      {children}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-8 text-center text-xs text-tac-muted">{children}</div>
  );
}

/**
 * Rich empty state: muted ringed icon, what-appears-here + why, optional real CTA.
 * Restrained per DESIGN.md — an instrument's idle state, not a cute illustration.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: { label: string; icon?: ReactNode; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-tac-line text-tac-muted">
        {icon}
      </span>
      <div className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-tac-text">
        {title}
      </div>
      <p className="max-w-[26ch] text-[11px] leading-relaxed text-tac-muted">{children}</p>
      {action && (
        <Button variant="accent" className="mt-1" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}
