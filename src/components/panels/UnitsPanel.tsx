"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { Dot, EmptyState } from "@/components/ui";
import { AFFILIATION_LABELS, type Peer } from "@/lib/types";
import { bearing, compass, formatDistance, formatRelTime, haversine } from "@/lib/geo/utils";

/**
 * One roster row. Holds its own 4s tick so only this row re-renders to refresh
 * the relative "last seen" + stale state — the parent no longer re-sorts the
 * whole list on a timer; it re-renders only when the store pushes peer updates.
 */
function PeerRow({
  peer,
  here,
  onFocus,
}: {
  peer: Peer;
  here: { lat: number; lng: number } | null;
  onFocus: (id: string) => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const dist = here ? haversine(here, peer) : null;
  const brg = here ? bearing(here, peer) : null;
  const stale = Date.now() - peer.lastSeen > 30_000;

  return (
    <button
      type="button"
      onClick={() => onFocus(peer.id)}
      className="flex items-center gap-2.5 border-b border-tac-line/60 px-3 py-2.5 text-left hover:bg-tac-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tac-accent"
    >
      <Dot affiliation={peer.affiliation} className={stale ? "opacity-40" : ""} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-sm font-semibold text-tac-text">
            {peer.callsign}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-tac-muted">
            {AFFILIATION_LABELS[peer.affiliation]}
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-tac-muted">
          {dist != null ? `${formatDistance(dist)} · ${compass(brg!)} ${Math.round(brg!)}°` : "distancia n/d"}
        </div>
      </div>
      <div className="text-right text-[11px] tabular-nums text-tac-muted">
        <div className={stale ? "text-tac-warn" : ""}>{formatRelTime(peer.lastSeen)}</div>
        {peer.battery != null && <div>{peer.battery}%</div>}
      </div>
    </button>
  );
}

export function UnitsPanel() {
  const peers = useStore((s) => s.peers);
  const self = useStore((s) => s.self);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const setFollowSelf = useStore((s) => s.setFollowSelf);
  const connState = useStore((s) => s.connection.state);
  const connect = useStore((s) => s.connect);

  const hasFix = self.lat != null && self.lng != null;
  const here = useMemo(
    () => (hasFix ? { lat: self.lat!, lng: self.lng! } : null),
    [hasFix, self.lat, self.lng],
  );

  const sorted = useMemo(() => {
    const list = Object.values(peers);
    if (here) return list.sort((a, b) => haversine(here, a) - haversine(here, b));
    return list.sort((a, b) => b.lastSeen - a.lastSeen);
  }, [peers, here]);

  const focus = (id: string) => {
    setFollowSelf(false);
    requestFlyTo(id);
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => {
          setFollowSelf(true);
          requestFlyTo(self.id);
        }}
        className="flex items-center gap-2.5 border-b border-tac-line px-3 py-2.5 text-left hover:bg-tac-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tac-accent"
      >
        <Dot affiliation="self" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-semibold text-tac-self">{self.callsign}</div>
          <div className="text-[11px] text-tac-muted">
            {hasFix ? `±${Math.round(self.accuracy ?? 0)}m · propio` : "buscando GPS…"}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-tac-muted">TÚ</span>
      </button>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-5 w-5" />}
          title="Malla vacía"
          action={
            connState === "disconnected"
              ? {
                  label: "Conectar malla demo",
                  icon: <Radio className="h-4 w-4" />,
                  onClick: () => void connect("simulated").catch(() => {}),
                }
              : undefined
          }
        >
          {connState === "connected"
            ? "Enlace activo. Las unidades del equipo aparecerán aquí con rango, rumbo y batería en vivo en cuanto emitan."
            : "Las unidades del equipo aparecen aquí con rango, rumbo y batería. Conecta la malla demo para ver tráfico al instante."}
        </EmptyState>
      ) : (
        sorted.map((p) => <PeerRow key={p.id} peer={p} here={here} onFocus={focus} />)
      )}
    </div>
  );
}
