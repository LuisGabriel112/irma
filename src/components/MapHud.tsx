"use client";

import { useEffect, useRef } from "react";
import { ArrowRightFromLine, ArrowRightToLine, Check, Navigation, Siren, Undo2, X } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { Button } from "@/components/ui";
import { ALERT_LABELS, type FenceEvent, type LatLng } from "@/lib/types";
import { bearing, compass, formatDistance, formatGrid, haversine } from "@/lib/geo/utils";

const DRAW_HINTS: Record<string, string> = {
  "draw-line": "Toca el mapa para añadir vértices. Termina para guardar la línea.",
  "draw-polygon": "Toca para añadir vértices (mín. 3). Termina para cerrar el polígono.",
  "draw-circle": "Toca el centro, luego el borde para fijar el radio.",
};

/** Floating draw controls — undo / finish / cancel while a draw tool is active. */
export function DrawControls() {
  const tool = useStore((s) => s.tool);
  const draft = useStore((s) => s.draft);
  const undoDraftPoint = useStore((s) => s.undoDraftPoint);
  const commitDraft = useStore((s) => s.commitDraft);
  const setTool = useStore((s) => s.setTool);

  if (!tool.startsWith("draw-")) return null;
  const min = tool === "draw-polygon" ? 3 : 2;
  const canFinish = tool !== "draw-circle" && draft.length >= min;

  return (
    <div className="pointer-events-auto absolute bottom-[calc(5.25rem+var(--safe-bottom))] left-1/2 z-30 flex w-[min(94vw,26rem)] -translate-x-1/2 flex-col items-center gap-2 rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel/90 px-3 py-2.5 backdrop-blur-md lg:bottom-6 lg:w-auto">
      <span className="text-[11px] text-tac-muted">
        {DRAW_HINTS[tool]} <span className="text-tac-text">· {draft.length} pts</span>
      </span>
      <div className="flex items-center gap-2">
        <Button variant="default" onClick={undoDraftPoint} disabled={draft.length === 0}>
          <Undo2 className="h-4 w-4" /> Deshacer
        </Button>
        {tool !== "draw-circle" && (
          <Button variant="accent" onClick={commitDraft} disabled={!canFinish}>
            <Check className="h-4 w-4" /> Terminar
          </Button>
        )}
        <Button variant="ghost" onClick={() => setTool("pan")}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Bloodhound HUD — live distance + bearing to the selected nav target. */
export function NavHud() {
  const navTargetId = useStore((s) => s.navTargetId);
  const setNavTarget = useStore((s) => s.setNavTarget);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const selfLat = useStore((s) => s.self.lat);
  const selfLng = useStore((s) => s.self.lng);
  const peers = useStore((s) => s.peers);
  const markers = useStore((s) => s.markers);

  if (!navTargetId || selfLat == null || selfLng == null) return null;

  let to: LatLng | null = null;
  let label = "";
  if (peers[navTargetId]) {
    to = { lat: peers[navTargetId].lat, lng: peers[navTargetId].lng };
    label = peers[navTargetId].callsign;
  } else if (markers[navTargetId]) {
    to = markers[navTargetId].coords[0];
    label = markers[navTargetId].label ?? "Marcador";
  }
  if (!to) return null;

  const here = { lat: selfLat, lng: selfLng };
  const dist = haversine(here, to);
  const brg = bearing(here, to);

  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--statusbar-h)+0.5rem)] z-30 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel/90 px-3 py-2 backdrop-blur-md">
      <Navigation className="h-4 w-4 text-fuchsia-300" style={{ transform: `rotate(${brg}deg)` }} />
      <div className="leading-tight">
        <div className="font-mono text-sm font-semibold text-tac-text">{label}</div>
        <div className="font-mono text-[11px] tabular-nums text-tac-muted">
          {formatDistance(dist)} · {compass(brg)} {Math.round(brg)}°
        </div>
      </div>
      <button
        type="button"
        onClick={() => requestFlyTo(navTargetId)}
        className="text-[11px] text-tac-muted underline-offset-2 hover:text-tac-text hover:underline"
      >
        Ver
      </button>
      <button
        type="button"
        onClick={() => setNavTarget(null)}
        aria-label="Cancelar navegación"
        className="text-tac-muted hover:text-tac-text"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Distress banner — lists active alerts, beeps on arrival, lets you locate or dismiss. */
export function AlertBanner() {
  const alerts = useStore((s) => s.alerts);
  const clearAlert = useStore((s) => s.clearAlert);
  const setNavTarget = useStore((s) => s.setNavTarget);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const selfLat = useStore((s) => s.self.lat);
  const selfLng = useStore((s) => s.self.lng);

  const list = Object.values(alerts).sort((a, b) => b.ts - a.ts);
  const prevCount = useRef(0);

  // Beep when the active-alert count rises (a new distress arrived).
  useEffect(() => {
    if (list.length > prevCount.current) beep();
    prevCount.current = list.length;
  }, [list.length]);

  if (list.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--statusbar-h)+0.5rem)] z-40 flex w-[min(92vw,28rem)] -translate-x-1/2 flex-col gap-1.5">
      {list.map((a) => {
        const dist =
          selfLat != null && selfLng != null
            ? haversine({ lat: selfLat, lng: selfLng }, { lat: a.lat, lng: a.lng })
            : null;
        return (
          <div
            key={a.id}
            className="flex items-center gap-2.5 rounded-[var(--radius-tac)] border border-tac-danger/60 bg-tac-danger/15 px-3 py-2 backdrop-blur-md"
          >
            <Siren className="h-5 w-5 shrink-0 animate-pulse text-tac-danger" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-mono text-sm font-semibold text-tac-danger">
                {ALERT_LABELS[a.type]} · {a.from}
              </div>
              <div className="font-mono text-[11px] tabular-nums text-tac-muted">
                {dist != null ? `a ${formatDistance(dist)}` : "distancia n/d"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNavTarget(a.id);
                requestFlyTo(a.id);
              }}
              className="text-[11px] font-semibold uppercase tracking-wide text-tac-danger hover:underline"
            >
              Ir
            </button>
            <button
              type="button"
              onClick={() => clearAlert(a.id)}
              aria-label="Descartar alerta"
              className="text-tac-muted hover:text-tac-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Short attention beep via WebAudio — no asset, works offline. `from`/`to` set
// the two-tone sweep so callers can give distinct events distinct signatures.
function beep(from = 880, to = 660) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = from;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.frequency.setValueAtTime(to, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.24);
    osc.onended = () => ctx.close();
  } catch {
    /* audio blocked (no user gesture yet) — non-fatal */
  }
}

/**
 * Geofence breach banners — slide in top-centre when a unit crosses a fence,
 * beep (rising tone on entry, falling on exit, distinct from the distress
 * siren), and auto-dismiss. "Ir" recentres on where the crossing happened.
 */
export function GeofenceBanner() {
  const events = useStore((s) => s.fenceEvents);
  const seen = useRef<Set<string>>(new Set());

  // Beep once per newly-arrived event, with a tone that encodes the direction.
  useEffect(() => {
    for (const e of events) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      beep(e.dir === "enter" ? 620 : 990, e.dir === "enter" ? 990 : 440);
    }
    // Forget ids no longer in the list so a future reuse can beep again.
    if (seen.current.size > 32) seen.current = new Set(events.map((e) => e.id));
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--statusbar-h)+0.5rem)] z-40 flex w-[min(92vw,28rem)] -translate-x-1/2 flex-col gap-1.5">
      {events.map((e) => (
        <FenceRow key={e.id} event={e} />
      ))}
    </div>
  );
}

const FENCE_BANNER_MS = 8000;

function FenceRow({ event }: { event: FenceEvent }) {
  const clearFenceEvent = useStore((s) => s.clearFenceEvent);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const selfId = useStore((s) => s.self.id);

  useEffect(() => {
    const t = setTimeout(() => clearFenceEvent(event.id), FENCE_BANNER_MS);
    return () => clearTimeout(t);
  }, [event.id, clearFenceEvent]);

  const entered = event.dir === "enter";
  const isSelf = event.unitId === selfId;
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-tac)] border border-tac-warn/60 bg-tac-warn/15 px-3 py-2 backdrop-blur-md">
      {entered ? (
        <ArrowRightToLine className="h-5 w-5 shrink-0 text-tac-warn" />
      ) : (
        <ArrowRightFromLine className="h-5 w-5 shrink-0 text-tac-warn" />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="font-mono text-sm font-semibold text-tac-warn">
          ⬡ {isSelf ? "TÚ" : event.unitName} {entered ? "ENTRÓ a" : "SALIÓ de"} {event.zone}
        </div>
        <div className="font-mono text-[11px] tabular-nums text-tac-muted">
          {formatGrid(event.lat, event.lng)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => requestFlyTo(event.fenceId)}
        className="text-[11px] font-semibold uppercase tracking-wide text-tac-warn hover:underline"
      >
        Ir
      </button>
      <button
        type="button"
        onClick={() => clearFenceEvent(event.id)}
        aria-label="Descartar aviso"
        className="text-tac-muted hover:text-tac-text"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
