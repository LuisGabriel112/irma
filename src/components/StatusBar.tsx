"use client";

import { useEffect, useState } from "react";
import { Battery, BatteryLow, SatelliteDish, Signal, Users } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { STATE_LABELS, TRANSPORT_LABELS } from "@/lib/transport/types";
import { formatLatLng } from "@/lib/geo/utils";
import { cn } from "@/lib/util/cn";

const LINK_COLOR = {
  connected: "text-tac-accent",
  connecting: "text-tac-warn",
  error: "text-tac-danger",
  disconnected: "text-tac-muted",
} as const;

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
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
  const peerCount = useStore((s) => Object.keys(s.peers).length);

  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const hasFix = lat != null && lng != null;

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-3 border-b border-tac-line bg-tac-panel/85 px-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold tracking-[0.18em] text-tac-accent">IRMA</span>
        <span className="hidden text-[10px] uppercase tracking-widest text-tac-muted sm:inline">
          Conciencia Táctica
        </span>
      </div>

      <div className="h-5 w-px bg-tac-line" />

      <Chip className="font-semibold text-tac-self">
        {callsign}
        <span className="text-tac-muted">·{team}</span>
      </Chip>

      <div className="ml-auto flex items-center gap-3 overflow-x-auto">
        <Chip className={hasFix ? "text-tac-text" : "text-tac-danger"}>
          <SatelliteDish className="h-3.5 w-3.5" />
          {hasFix ? (
            <span>
              {formatLatLng(lat!, lng!, 4)}
              {accuracy != null && <span className="text-tac-muted"> ±{Math.round(accuracy)}m</span>}
            </span>
          ) : (
            "SIN GPS"
          )}
        </Chip>

        <Chip className={LINK_COLOR[connState]}>
          <Signal className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {connKind ? TRANSPORT_LABELS[connKind] : "SIN ENLACE"} ·{" "}
          </span>
          {STATE_LABELS[connState]}
        </Chip>

        <Chip>
          <Users className="h-3.5 w-3.5 text-tac-muted" />
          {peerCount}
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
