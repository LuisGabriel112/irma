"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal — an entrance enhancement, never a visibility gate. The server markup
 * renders fully visible with no hidden class, so no-JS and reduced-motion users
 * always see the content. Only when JS runs and motion is allowed does it set
 * the "from" state and ease it in on first view. If the observer never fires
 * (hidden tab, headless render), the content stays visible — it never ships
 * blank.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Apply the from-state via JS so it never exists in no-JS markup.
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    el.style.transition =
      "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)";
    el.style.transitionDelay = `${delay}ms`;
    el.style.willChange = "opacity, transform";

    const reveal = () => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      const clear = () => {
        el.style.willChange = "";
        el.removeEventListener("transitionend", clear);
      };
      el.addEventListener("transitionend", clear);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref as never}
      className={["min-w-0", className].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}
