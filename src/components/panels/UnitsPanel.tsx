"use client";

import { useEffect, useMemo, useState } from "react";
import { Cross, Grid3x3, History, Navigation, QrCode, Radio, Route, Video, VideoOff } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { CasevacForm } from "@/components/CasevacForm";
import { QrShare } from "@/components/QrShare";
import { SYMBOL_PALETTE } from "@/lib/symbols";
import { Dot, EmptyState } from "@/components/ui";
import { cn } from "@/lib/util/cn";
import {
  AFFILIATION_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Peer,
  type UnitStatus,
} from "@/lib/types";
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

  const navTargetId = useStore((s) => s.navTargetId);
  const setNavTarget = useStore((s) => s.setNavTarget);
  const isNav = navTargetId === peer.id;

  const watching = useStore((s) => s.watching.includes(peer.id));
  const watchPeer = useStore((s) => s.watchPeer);
  const unwatchPeer = useStore((s) => s.unwatchPeer);
  const wsLink = useStore((s) => s.connection.kind === "websocket" && s.connection.state === "connected");

  const peerLL = peer.lat != null && peer.lng != null ? { lat: peer.lat, lng: peer.lng } : null;
  const dist = here && peerLL ? haversine(here, peerLL) : null;
  const brg = here && peerLL ? bearing(here, peerLL) : null;
  const stale = Date.now() - peer.lastSeen > 30_000;

  return (
    <div className="flex items-stretch border-b border-tac-line/60 hover:bg-tac-panel-2">
      <button
        type="button"
        onClick={() => onFocus(peer.id)}
        className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tac-accent"
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
            {peer.status && peer.status !== "ok" && (
              <span
                className="rounded px-1 text-[9px] font-bold uppercase tracking-wide"
                style={{ color: STATUS_COLORS[peer.status], border: `1px solid ${STATUS_COLORS[peer.status]}` }}
              >
                {STATUS_LABELS[peer.status]}
              </span>
            )}
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
      {wsLink && (
        <button
          type="button"
          onClick={() => (watching ? unwatchPeer(peer.id) : watchPeer(peer.id))}
          title={watching ? "Cerrar video" : "Ver cámara en vivo"}
          aria-label={watching ? "Cerrar video" : "Ver cámara en vivo"}
          aria-pressed={watching}
          className={cn(
            "flex w-11 shrink-0 items-center justify-center border-l border-tac-line/60 transition-colors",
            watching ? "text-tac-accent" : "text-tac-muted hover:text-tac-text",
          )}
        >
          {watching ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </button>
      )}
      <button
        type="button"
        onClick={() => setNavTarget(isNav ? null : peer.id)}
        title={isNav ? "Cancelar navegación" : "Navegar a esta unidad"}
        aria-label={isNav ? "Cancelar navegación" : "Navegar a esta unidad"}
        aria-pressed={isNav}
        className={cn(
          "flex w-11 shrink-0 items-center justify-center border-l border-tac-line/60 transition-colors",
          isNav ? "text-fuchsia-300" : "text-tac-muted hover:text-tac-text",
        )}
      >
        <Navigation className="h-4 w-4" />
      </button>
    </div>
  );
}

export function UnitsPanel() {
  const peers = useStore((s) => s.peers);
  const self = useStore((s) => s.self);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const setFollowSelf = useStore((s) => s.setFollowSelf);
  const connState = useStore((s) => s.connection.state);
  const connect = useStore((s) => s.connect);
  const videoBroadcasting = useStore((s) => s.videoBroadcasting);
  const startVideo = useStore((s) => s.startVideo);
  const stopVideo = useStore((s) => s.stopVideo);
  const wsLink = useStore((s) => s.connection.kind === "websocket" && s.connection.state === "connected");
  const status = useStore((s) => s.self.status);
  const setStatus = useStore((s) => s.setStatus);
  const symbol = useStore((s) => s.self.symbol);
  const setSelfSymbol = useStore((s) => s.setSelfSymbol);
  const trailsOn = useStore((s) => s.trailsOn);
  const toggleTrails = useStore((s) => s.toggleTrails);
  const gridOn = useStore((s) => s.gridOn);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const startReplay = useStore((s) => s.startReplay);
  const historyLen = useStore((s) => s.history.length);
  const [casevacOpen, setCasevacOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const hasFix = self.lat != null && self.lng != null;
  const here = useMemo(
    () => (hasFix ? { lat: self.lat!, lng: self.lng! } : null),
    [hasFix, self.lat, self.lng],
  );

  const sorted = useMemo(() => {
    const list = Object.values(peers);
    if (here) {
      // No-fix peers (lat/lng undefined) sort to the bottom via Infinity.
      const d = (p: Peer) =>
        p.lat != null && p.lng != null ? haversine(here, { lat: p.lat, lng: p.lng }) : Infinity;
      return list.sort((a, b) => d(a) - d(b));
    }
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

      <div className="flex items-center gap-2 border-b border-tac-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-wide text-tac-muted">Estado</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UnitStatus)}
          className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1 text-xs font-semibold text-tac-text focus:border-tac-accent focus:outline-none"
          style={{ color: STATUS_COLORS[status] }}
        >
          {(Object.keys(STATUS_LABELS) as UnitStatus[]).map((k) => (
            <option key={k} value={k}>
              {STATUS_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={toggleGrid}
          aria-pressed={gridOn}
          title="Mostrar cuadrícula MGRS"
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-[var(--radius-tac)] border px-2 py-1 text-xs transition-colors",
            gridOn
              ? "border-tac-accent text-tac-accent"
              : "border-tac-line text-tac-muted hover:text-tac-text",
          )}
        >
          <Grid3x3 className="h-3.5 w-3.5" /> MGRS
        </button>
        <button
          type="button"
          onClick={toggleTrails}
          aria-pressed={trailsOn}
          title="Mostrar rastros de movimiento"
          className={cn(
            "flex items-center gap-1.5 rounded-[var(--radius-tac)] border px-2 py-1 text-xs transition-colors",
            trailsOn
              ? "border-tac-accent text-tac-accent"
              : "border-tac-line text-tac-muted hover:text-tac-text",
          )}
        >
          <Route className="h-3.5 w-3.5" /> Rastros
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-tac-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-wide text-tac-muted">Función</span>
        <select
          value={symbol ?? ""}
          onChange={(e) => setSelfSymbol(e.target.value || undefined)}
          title="Tu símbolo MIL-STD-2525 (lo ven tus compañeros)"
          className="ml-auto rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1 text-xs text-tac-text focus:border-tac-accent focus:outline-none"
        >
          {SYMBOL_PALETTE.map((s) => (
            <option key={s.key} value={s.key === "unit" ? "" : s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setCasevacOpen(true)}
        className="flex items-center gap-2 border-b border-tac-line px-3 py-2 text-left text-xs text-tac-danger transition-colors hover:bg-tac-danger/10"
      >
        <Cross className="h-4 w-4" />
        <span className="font-medium">Emitir CASEVAC (9-line)</span>
      </button>
      {casevacOpen && <CasevacForm onClose={() => setCasevacOpen(false)} />}

      <button
        type="button"
        onClick={() => setQrOpen(true)}
        className="flex items-center gap-2 border-b border-tac-line px-3 py-2 text-left text-xs text-tac-muted transition-colors hover:bg-tac-panel-2 hover:text-tac-text"
      >
        <QrCode className="h-4 w-4" />
        <span className="font-medium">Compartir sala (QR)</span>
      </button>
      {qrOpen && <QrShare onClose={() => setQrOpen(false)} />}

      <button
        type="button"
        onClick={startReplay}
        disabled={historyLen === 0}
        className="flex items-center gap-2 border-b border-tac-line px-3 py-2 text-left text-xs text-tac-muted transition-colors hover:bg-tac-panel-2 hover:text-tac-text disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <History className="h-4 w-4" />
        <span className="font-medium">
          Reproducir misión{historyLen > 0 ? ` (${historyLen} cuadros)` : " — sin datos aún"}
        </span>
      </button>

      {wsLink && (
        <button
          type="button"
          onClick={() => (videoBroadcasting ? stopVideo() : void startVideo())}
          aria-pressed={videoBroadcasting}
          className={cn(
            "flex items-center gap-2 border-b border-tac-line px-3 py-2 text-left text-xs transition-colors hover:bg-tac-panel-2",
            videoBroadcasting ? "text-tac-accent" : "text-tac-muted",
          )}
        >
          {videoBroadcasting ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          <span className="font-medium">
            {videoBroadcasting ? "Transmitiendo cámara — toca para detener" : "Transmitir mi cámara a la malla"}
          </span>
        </button>
      )}

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
