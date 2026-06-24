"use client";

import { useState } from "react";
import {
  ChevronRight,
  MapPin,
  MessageSquare,
  Radio,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { cn } from "@/lib/util/cn";
import { UnitsPanel } from "@/components/panels/UnitsPanel";
import { ChatPanel } from "@/components/panels/ChatPanel";
import { MarkersPanel } from "@/components/panels/MarkersPanel";
import { LinkPanel } from "@/components/panels/LinkPanel";

type Tab = "units" | "chat" | "markers" | "link";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "units", label: "Unidades", icon: <Users className="h-4 w-4" /> },
  { id: "chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "markers", label: "Gráficos", icon: <MapPin className="h-4 w-4" /> },
  { id: "link", label: "Enlace", icon: <Radio className="h-4 w-4" /> },
];

export function SidePanel() {
  const [tab, setTab] = useState<Tab>("units");
  // Phones boot with the panel closed so the map (the product) owns first paint;
  // tablets/desktops have room to show it alongside.
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 768px)").matches,
  );
  const unread = useStore((s) => s.unread);
  const peerCount = useStore((s) => Object.keys(s.peers).length);

  return (
    <>
      {/* Reopen handle — taller tap target on touch */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir panel"
          className="pointer-events-auto absolute right-0 top-1/2 z-20 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-l-[var(--radius-tac)] border border-r-0 border-tac-line bg-tac-panel/90 text-tac-muted backdrop-blur-md hover:text-tac-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tac-accent"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      )}

      <aside
        className={cn(
          "pointer-events-auto absolute bottom-0 right-0 z-20 flex w-full flex-col border-l border-tac-line bg-tac-panel/95 backdrop-blur-md transition-transform duration-200 sm:w-[360px] sm:max-w-[88vw]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ top: "var(--statusbar-h)" }}
      >
        {/* Tab strip */}
        <div className="flex items-stretch border-b border-tac-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:py-2.5",
                tab === t.id
                  ? "bg-tac-panel-2 text-tac-accent"
                  : "text-tac-muted hover:text-tac-text",
              )}
            >
              <span className="relative">
                {t.icon}
                {t.id === "chat" && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-tac-danger px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
                {t.id === "units" && peerCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-tac-accent-dim px-1 text-[9px] font-bold text-tac-text">
                    {peerCount}
                  </span>
                )}
              </span>
              {t.label}
              {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-tac-accent" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Contraer panel"
            className="flex w-11 items-center justify-center border-l border-tac-line text-tac-muted hover:text-tac-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tac-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="min-h-0 flex-1 overflow-hidden"
          style={{ paddingBottom: "var(--safe-bottom)" }}
        >
          {tab === "chat" ? (
            <ChatPanel />
          ) : tab === "link" ? (
            <div className="h-full overflow-y-auto">
              <LinkPanel />
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {tab === "units" && <UnitsPanel />}
              {tab === "markers" && <MarkersPanel />}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
