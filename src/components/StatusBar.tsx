"use client";

import { useEffect, useState } from "react";
import { Battery, BatteryLow, Lock, SatelliteDish, Signal, Users } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { STATE_LABELS, TRANSPORT_LABELS } from "@/lib/transport/types";
import { formatGrid } from "@/lib/geo/utils";
import { cn } from "@/lib/util/cn";

const LINK_COLOR = {
  connected: "text-tac-accent",
  connecting: "text-tac-warn",
  error: "text-tac-danger",
  disconnected: "text-tac-muted",
} as const;

function Chip({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      title={title}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tabular-nums text-tac-text",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatusBar() {
  const callsign = useStore((s) => s.self.callsign);
  const team = useStore((s) => s.self.team);
  const lat = useStore((s) => s.self.lat);
  const lng = useStore((s) => s.self.lng);
  const accuracy = useStore((s) => s.self.accuracy);
  const battery = useStore((s) => s.self.battery);
  const connState = useStore((s) => s.connection.state);
  const connKind = useStore((s) => s.connection.kind);
  const room = useStore((s) => s.self.room);
  const encrypted = useStore((s) => !!s.self.secret?.trim());
  const peers = useStore((s) => s.peers);

  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Link health: how many teammates we've heard from recently vs total tracked.
  const total = Object.keys(peers).length;
  const live = Object.values(peers).filter((p) => clock && Date.now() - p.lastSeen < 30_000).length;

  const hasFix = lat != null && lng != null;

  return (
    <header
      className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 border-b border-tac-line bg-tac-panel/85 px-3 backdrop-blur-md sm:gap-3"
      style={{
        height: "var(--statusbar-h)",
        paddingTop: "var(--safe-top)",
        paddingLeft: "max(0.75rem, var(--safe-left))",
        paddingRight: "max(0.75rem, var(--safe-right))",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold tracking-[0.18em] text-tac-accent">IRMA</span>
        <span className="hidden text-[10px] uppercase tracking-widest text-tac-muted md:inline">
          Conciencia Táctica
        </span>
      </div>

      <div className="hidden h-5 w-px bg-tac-line sm:block" />

      <Chip className="font-semibold text-tac-self">
        {callsign}
        <span className="text-tac-muted">·{team}</span>
      </Chip>

      <div className="ml-auto flex items-center gap-3 overflow-x-auto">
        <Chip className={hasFix ? "text-tac-text" : "text-tac-danger"}>
          <SatelliteDish className="h-3.5 w-3.5 shrink-0" />
          {hasFix ? (
            <span>
              {/* MGRS grid on tablet+; just accuracy on a phone to save width. */}
              <span className="hidden sm:inline">{formatGrid(lat!, lng!)} </span>
              {accuracy != null && <span className="text-tac-muted">±{Math.round(accuracy)}m</span>}
            </span>
          ) : (
            "SIN GPS"
          )}
        </Chip>

        <Chip className={LINK_COLOR[connState]}>
          <Signal className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {connKind ? TRANSPORT_LABELS[connKind] : "SIN ENLACE"}
            {connState === "connected" && connKind === "websocket" ? ` · ${room}` : ""} ·{" "}
          </span>
          {STATE_LABELS[connState]}
        </Chip>

        {encrypted && (
          <Chip className="text-tac-accent" title="Tráfico cifrado de extremo a extremo">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden md:inline">CIFRADO</span>
          </Chip>
        )}

        <Chip className={total > 0 && live === 0 ? "text-tac-warn" : undefined}>
          <Users className="h-3.5 w-3.5 text-tac-muted" />
          {live}
          <span className="text-tac-muted">/{total}</span>
        </Chip>

        {battery != null && (
          <Chip className={battery <= 20 ? "text-tac-danger" : "text-tac-text"}>
            {battery <= 20 ? (
              <BatteryLow className="h-3.5 w-3.5" />
            ) : (
              <Battery className="h-3.5 w-3.5" />
            )}
            {Math.round(battery)}%
          </Chip>
        )}

        <Chip className="hidden text-tac-muted sm:flex">{clock}</Chip>
      </div>
    </header>
  );
}
