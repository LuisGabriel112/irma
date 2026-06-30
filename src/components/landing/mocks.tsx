import {
  Hand,
  MapPin,
  Minus,
  Hexagon,
  Circle as CircleIcon,
  Ruler,
  Crosshair,
  Siren,
  Mic,
  Video,
  Radio,
  Globe,
  Cpu,
} from "lucide-react";
import { Dot, SpecRow } from "./primitives";

/**
 * Demonstrative mocks — static, faithful reconstructions of IRMA's real surfaces
 * (map marker, roster, tool dock, nav HUD, link list, comms). They let the
 * landing show the instrument instead of describing it in the abstract. No live
 * Leaflet/WebRTC shipped here; these are CSS/SVG stand-ins built from the same
 * tokens and component classes the app uses.
 */

const C = {
  self: "#3ddc84",
  friend: "#38bdf8",
  hostile: "#ff4d4d",
  neutral: "#cbd5cf",
  warn: "#ffb020",
};

/* The live map: dark tiles, the own-position heading arrow over its pulse, a GPS
   accuracy ring, and two peers rendered by affiliation. */
export function MapMock() {
  return (
    <div className="map-mock relative aspect-[4/3] w-full overflow-hidden rounded-tac border border-tac-line">
      {/* accuracy ring + self marker */}
      <div className="absolute left-[38%] top-[58%] -translate-x-1/2 -translate-y-1/2">
        <div className="accuracy-ring absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <div className="irma-self">
          <div className="irma-self-pulse" />
          <div className="irma-self-arrow" style={{ transform: "translate(-50%,-60%) rotate(28deg)" }} />
        </div>
        <span className="absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold text-tac-self [text-shadow:0_0_3px_#0a0e0d]">
          RAVEN-1
        </span>
      </div>
      {/* friend peer */}
      <Peer x="68%" y="34%" color={C.friend} label="HALCÓN-2" />
      {/* hostile contact */}
      <Peer x="22%" y="30%" color={C.hostile} label="X-RAY" diamond />
      {/* a waypoint */}
      <div className="absolute left-[54%] top-[74%]">
        <MapPin className="size-4 text-tac-self [filter:drop-shadow(0_0_2px_#0a0e0d)]" strokeWidth={2.5} />
      </div>
      {/* MGRS margin tag */}
      <span className="absolute bottom-2 left-2 rounded border border-[#5eead4]/70 bg-tac-bg/70 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#5eead4]">
        14Q QG
      </span>
    </div>
  );
}

function Peer({
  x,
  y,
  color,
  label,
  diamond,
}: {
  x: string;
  y: string;
  color: string;
  label: string;
  diamond?: boolean;
}) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <span
        aria-hidden
        className="block size-2.5"
        style={{
          background: color,
          boxShadow: `0 0 6px ${color}`,
          borderRadius: diamond ? 0 : 9999,
          transform: diamond ? "rotate(45deg)" : undefined,
        }}
      />
      <span
        className="absolute left-1/2 top-3.5 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold [text-shadow:0_0_3px_#0a0e0d]"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

/* The right-panel roster: peers by affiliation with range, bearing, battery and
   operational status. */
const ROSTER = [
  { call: "HALCÓN-2", aff: C.friend, rng: "412 m", brg: "058°", bat: 88, st: "OK", stTone: "accent" },
  { call: "LOBO-3", aff: C.friend, rng: "1.2 km", brg: "131°", bat: 64, st: "OK", stTone: "accent" },
  { call: "MÉDICO-7", aff: C.friend, rng: "880 m", brg: "274°", bat: 41, st: "AYUDA", stTone: "warn" },
  { call: "ECO-5", aff: C.neutral, rng: "2.0 km", brg: "012°", bat: 73, st: "—", stTone: "muted" },
  { call: "X-RAY", aff: C.hostile, rng: "640 m", brg: "303°", bat: undefined, st: "HOSTIL", stTone: "danger" },
] as const;

export function RosterMock() {
  return (
    <ul className="divide-y divide-tac-line">
      {ROSTER.map((u) => (
        <li key={u.call} className="flex items-center gap-3 px-3 py-2.5">
          <Dot color={u.aff} />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[0.8125rem] font-semibold text-tac-text">{u.call}</div>
            <div className="font-mono text-[0.6875rem] text-tac-muted [font-variant-numeric:tabular-nums]">
              {u.rng} · {u.brg}
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-mono text-[0.6875rem] font-semibold [font-variant-numeric:tabular-nums]"
              style={{
                color:
                  u.stTone === "accent"
                    ? C.self
                    : u.stTone === "warn"
                      ? C.warn
                      : u.stTone === "danger"
                        ? C.hostile
                        : "#7d8f86",
              }}
            >
              {u.st}
            </div>
            <div className="font-mono text-[0.6875rem] text-tac-muted [font-variant-numeric:tabular-nums]">
              {u.bat !== undefined ? `${u.bat}%` : "— GPS"}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* The four NATO affiliation frames — shape carries the meaning so a red-green
   deficit never reads hostile as friend. */
export function AffiliationFrames() {
  const items = [
    { label: "Propio", color: C.self, shape: "cross" },
    { label: "Aliado", color: C.friend, shape: "round" },
    { label: "Neutral", color: C.neutral, shape: "square" },
    { label: "Hostil", color: C.hostile, shape: "diamond" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-tac border border-tac-line bg-tac-line sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-2.5 bg-tac-panel px-3 py-4">
          <svg viewBox="0 0 40 40" className="size-9" style={{ color: it.color }} aria-hidden>
            {it.shape === "round" && (
              <rect x="6" y="10" width="28" height="20" rx="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
            )}
            {it.shape === "square" && (
              <rect x="8" y="8" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" />
            )}
            {it.shape === "diamond" && (
              <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" fill="none" stroke="currentColor" strokeWidth="2.5" />
            )}
            {it.shape === "cross" && (
              <>
                <line x1="20" y1="6" x2="20" y2="34" stroke="currentColor" strokeWidth="2.5" />
                <line x1="6" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="2.5" />
              </>
            )}
          </svg>
          <span className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* The left tool dock — 40px glove-sized cells, exactly one armed. */
const TOOLS: {
  icon: typeof Hand;
  name: string;
  color: string;
  armed?: boolean;
}[] = [
  { icon: Hand, name: "Mano", color: "#e6efe9" },
  { icon: MapPin, name: "Marcador", color: C.friend, armed: true },
  { icon: Minus, name: "Línea", color: C.self },
  { icon: Hexagon, name: "Polígono", color: C.self },
  { icon: CircleIcon, name: "Círculo", color: C.self },
  { icon: Ruler, name: "Medir", color: C.warn },
  { icon: Crosshair, name: "Fijar posición", color: C.self },
  { icon: Siren, name: "Pánico", color: C.hostile },
] as const;

export function ToolDockMock() {
  return (
    <div className="flex flex-row flex-wrap gap-2 sm:flex-col">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.name}
            className="flex items-center gap-3"
            title={t.name}
          >
            <span
              className="grid size-10 shrink-0 place-items-center rounded-tac border"
              style={{
                borderColor: t.armed ? t.color : "#2a322f",
                background: t.armed ? "rgba(56,189,248,0.10)" : "transparent",
                color: t.armed ? t.color : "#7d8f86",
              }}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="hidden font-sans text-[0.6875rem] text-tac-muted sm:inline">
              {t.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* The bloodhound navigation readout: target, live range, and a bearing needle. */
export function NavHud() {
  const bearing = 287;
  return (
    <div className="rounded-tac border border-tac-line bg-tac-panel/85 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">
          Navegar a
        </span>
        <span className="font-mono text-[0.8125rem] font-semibold text-tac-info">MÉDICO-7</span>
      </div>
      <div className="mt-5 flex items-center gap-6">
        <div className="relative grid size-24 shrink-0 place-items-center rounded-full border border-tac-line">
          {/* compass ticks */}
          <span className="absolute inset-0 rounded-full border border-tac-line/60" />
          {/* bearing needle */}
          <span
            className="absolute h-10 w-0.5 origin-bottom bg-tac-warn"
            style={{ bottom: "50%", transform: `rotate(${bearing}deg)`, boxShadow: "0 0 6px #ffb020" }}
            aria-hidden
          />
          <span className="absolute top-1 font-mono text-[0.5rem] text-tac-muted">N</span>
          <span className="size-1.5 rounded-full bg-tac-warn" />
        </div>
        <div>
          <div className="font-mono text-[2.25rem] font-bold leading-none text-tac-text [font-variant-numeric:tabular-nums]">
            880<span className="ml-1 text-[1rem] font-semibold text-tac-muted">m</span>
          </div>
          <div className="mt-2 font-mono text-[0.9375rem] font-semibold text-tac-warn [font-variant-numeric:tabular-nums]">
            {bearing}° · O-NO
          </div>
        </div>
      </div>
    </div>
  );
}

/* The link panel: pluggable transports, each honest about its own state. */
const TRANSPORTS = [
  { icon: Cpu, name: "Malla simulada", sub: "Roster demo, sin hardware", state: "Listo", tone: "muted" },
  { icon: Globe, name: "Relay WebSocket", sub: "Salas por internet · wss", state: "Conectado", tone: "accent" },
] as const;

export function TransportList() {
  return (
    <ul className="divide-y divide-tac-line overflow-hidden rounded-tac border border-tac-line">
      {TRANSPORTS.map((t) => {
        const Icon = t.icon;
        const color = t.tone === "accent" ? C.self : "#7d8f86";
        return (
          <li key={t.name} className="flex items-center gap-3 bg-tac-panel/60 px-4 py-3.5">
            <Icon className="size-4 shrink-0 text-tac-muted" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[0.875rem] text-tac-text">{t.name}</div>
              <div className="font-mono text-[0.6875rem] text-tac-muted">{t.sub}</div>
            </div>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Dot color={color} />
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wide" style={{ color }}>
                {t.state}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* Net comms: broadcast chat, push-to-talk, and a live peer video tile. */
export function CommsMock() {
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-tac border border-tac-line bg-tac-panel/60 p-3">
        <ChatLine who="LOBO-3" tone="info" text="En posición en el cruce norte." />
        <ChatLine who="RAVEN-1" tone="self" text="Recibido. Mantengan distancia 50 m." me />
        <ChatLine who="MÉDICO-7" tone="warn" text="Necesito apoyo, paciente estable." />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-tac border border-tac-line bg-tac-panel px-3 py-2 font-sans text-[0.75rem] font-semibold text-tac-text"
        >
          <Mic className="size-4 text-tac-accent" strokeWidth={2} />
          Mantener para hablar
        </button>
        <div className="flex items-center gap-2 rounded-tac border border-tac-line bg-tac-bg px-3 py-2">
          <Video className="size-4 text-tac-info" strokeWidth={2} />
          <span className="font-mono text-[0.6875rem] text-tac-muted">2 en vivo</span>
        </div>
      </div>
    </div>
  );
}

function ChatLine({
  who,
  text,
  tone,
  me,
}: {
  who: string;
  text: string;
  tone: "info" | "self" | "warn";
  me?: boolean;
}) {
  const color = tone === "self" ? C.self : tone === "warn" ? C.warn : C.friend;
  return (
    <div className={me ? "text-right" : ""}>
      <span className="font-mono text-[0.625rem] font-semibold" style={{ color }}>
        {who}
      </span>
      <p className="font-sans text-[0.8125rem] text-tac-text/90">{text}</p>
    </div>
  );
}

/* The distress banner that flashes on every teammate's map. */
export function AlertBanner() {
  return (
    <div className="flex items-center gap-3 rounded-tac border border-tac-danger/60 bg-tac-danger/10 px-4 py-3">
      <Siren className="irma-alert-pulse size-5 text-tac-danger" strokeWidth={2.5} />
      <div className="flex-1">
        <span className="font-mono text-[0.8125rem] font-bold uppercase tracking-wide text-tac-danger">
          PÁNICO · RAVEN-1
        </span>
        <span className="ml-2 font-mono text-[0.6875rem] text-tac-muted [font-variant-numeric:tabular-nums]">
          19.4326, -99.1332 · hace 4 s
        </span>
      </div>
      <Radio className="size-4 text-tac-danger" strokeWidth={2} />
    </div>
  );
}
