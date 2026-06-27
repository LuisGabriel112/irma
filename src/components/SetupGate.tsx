"use client";

import { useEffect, useState } from "react";
import { Crosshair, KeyRound, LocateFixed, Radio, ShieldCheck } from "lucide-react";
import { joinFromLocation } from "@/lib/join";
import { useStore } from "@/lib/store/useStore";
import { Button } from "@/components/ui";
import { cn } from "@/lib/util/cn";
import { TEAMS } from "@/lib/util/identity";
import { AFFILIATION_COLORS, type Affiliation } from "@/lib/types";

const AFFILIATIONS: Array<{ value: Affiliation; label: string }> = [
  { value: "friend", label: "Aliado" },
  { value: "neutral", label: "Neutral" },
  { value: "unknown", label: "Sin marcar" },
];

type Fix = { lat: number; lng: number; accuracy?: number };

export function SetupGate() {
  const self = useStore((s) => s.self);
  const completeSetup = useStore((s) => s.completeSetup);

  const [callsign, setCallsign] = useState(self.callsign);
  const [team, setTeam] = useState(self.team);
  const [room, setRoom] = useState(self.room);
  const [secret, setSecret] = useState(self.secret ?? "");
  const [affiliation, setAffiliation] = useState<Affiliation>(self.affiliation);
  const [fix, setFix] = useState<Fix | null>(
    self.lat != null && self.lng != null
      ? { lat: self.lat, lng: self.lng, accuracy: self.accuracy }
      : null,
  );
  const [fixManual, setFixManual] = useState<boolean>(self.posManual ?? false);
  const [geoState, setGeoState] = useState<"idle" | "locating" | "error">("idle");
  const [manual, setManual] = useState(false);
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [joined, setJoined] = useState(false); // arrived via a shared join link

  // Pre-fill room + passphrase from a scanned join link (?join=...).
  useEffect(() => {
    const j = joinFromLocation();
    if (!j) return;
    setRoom(j.room);
    if (j.secret) setSecret(j.secret);
    setJoined(true);
    // Strip the secret-bearing query from the URL bar.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("error");
      setManual(true);
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setFixManual(false);
        setGeoState("idle");
      },
      () => {
        setGeoState("error");
        setManual(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const applyManual = () => {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      setFix({ lat, lng });
      setFixManual(true);
    }
  };

  const canSubmit = callsign.trim().length > 0 && room.trim().length > 0;

  const submit = () => {
    completeSetup({
      callsign,
      team,
      room,
      secret,
      affiliation,
      position: fix ? { ...fix, manual: fixManual } : undefined,
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tac-bg px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-[0.18em] text-tac-accent">IRMA</span>
          <span className="text-[10px] uppercase tracking-widest text-tac-muted">
            Alta de operador
          </span>
        </div>

        <p className="mb-6 text-[13px] leading-relaxed text-tac-muted">
          Configura tu identidad antes de entrar a la red. Nadie aparece en el mapa
          hasta completar el alta.
        </p>

        {joined && (
          <div className="mb-5 rounded-[var(--radius-tac)] border border-tac-accent/50 bg-tac-accent/10 px-3 py-2 text-[12px] text-tac-text">
            Te uniste a la sala <span className="font-mono text-tac-accent">{room}</span> por enlace
            {secret ? " (con clave de cifrado)" : ""}. Completa tu indicativo y entra.
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* Callsign */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-tac-muted">
              <ShieldCheck className="h-3.5 w-3.5" /> Indicativo
            </span>
            <input
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.toUpperCase())}
              maxLength={16}
              placeholder="RAVEN-1"
              className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-3 py-2.5 font-mono text-base uppercase text-tac-text focus:border-tac-accent focus:outline-none"
            />
          </label>

          {/* Team + Room */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-tac-muted">Equipo</span>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-3 py-2.5 text-sm text-tac-text focus:border-tac-accent focus:outline-none"
              >
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-tac-muted">
                <Radio className="h-3.5 w-3.5" /> Sala
              </span>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.toLowerCase())}
                maxLength={24}
                placeholder="alfa"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-3 py-2.5 font-mono text-sm lowercase text-tac-text focus:border-tac-accent focus:outline-none"
              />
            </label>
          </div>

          {/* Room passphrase (E2E encryption) */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-tac-muted">
              <KeyRound className="h-3.5 w-3.5" /> Clave de cifrado
              <span className="ml-1 normal-case tracking-normal text-tac-muted/70">opcional</span>
            </span>
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Frase compartida del equipo"
              className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-3 py-2.5 font-mono text-sm text-tac-text focus:border-tac-accent focus:outline-none"
            />
            <p className="text-[11px] leading-relaxed text-tac-muted">
              {secret.trim()
                ? "Tráfico cifrado de extremo a extremo. El relay no puede leerlo. Todo el equipo debe usar la misma sala y clave."
                : "Sin clave, el relay ve el tráfico en claro. Comparte una frase por canal seguro para cifrar."}
            </p>
          </label>

          {/* Affiliation */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-tac-muted">
              Cómo te ve el equipo
            </span>
            <div className="grid grid-cols-3 gap-2">
              {AFFILIATIONS.map((a) => {
                const active = affiliation === a.value;
                const color = AFFILIATION_COLORS[a.value];
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAffiliation(a.value)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-[var(--radius-tac)] border px-2 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent",
                      active ? "border-tac-accent bg-tac-accent/10 text-tac-text" : "border-tac-line text-tac-muted hover:border-tac-muted",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: color, boxShadow: active ? `0 0 6px ${color}` : "none" }}
                    />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-tac-muted">
              <Crosshair className="h-3.5 w-3.5" /> Posición inicial
            </span>
            <Button variant="default" onClick={useGps} disabled={geoState === "locating"}>
              <LocateFixed className="h-4 w-4" />
              {geoState === "locating" ? "Ubicando…" : fix ? "Reubicar con GPS" : "Usar mi GPS"}
            </Button>

            {fix && (
              <div className="font-mono text-[11px] tabular-nums text-tac-accent">
                {fix.lat.toFixed(4)}, {fix.lng.toFixed(4)}
                {fix.accuracy != null && (
                  <span className="text-tac-muted"> · ±{Math.round(fix.accuracy)}m</span>
                )}
              </div>
            )}

            {!manual ? (
              <button
                type="button"
                onClick={() => setManual(true)}
                className="self-start text-[11px] text-tac-muted underline-offset-2 hover:text-tac-text hover:underline"
              >
                {geoState === "error" ? "GPS no disponible — ingresar coordenadas" : "o ingresar coordenadas"}
              </button>
            ) : (
              <div className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-tac-muted">Lat</span>
                  <input
                    value={latStr}
                    onChange={(e) => setLatStr(e.target.value)}
                    onBlur={applyManual}
                    inputMode="decimal"
                    placeholder="19.4326"
                    className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-2 py-1.5 font-mono text-sm text-tac-text focus:border-tac-accent focus:outline-none"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-tac-muted">Lng</span>
                  <input
                    value={lngStr}
                    onChange={(e) => setLngStr(e.target.value)}
                    onBlur={applyManual}
                    inputMode="decimal"
                    placeholder="-99.1332"
                    className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-2 py-1.5 font-mono text-sm text-tac-text focus:border-tac-accent focus:outline-none"
                  />
                </label>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-tac-muted">
              En escritorio el GPS del navegador es aproximado (por IP/wifi).
              Si cae lejos, corrígela dentro del mapa con la herramienta{" "}
              <span className="text-tac-text">⌖ Fijar mi posición</span> (tocas tu punto real).
              Sin posición no apareces en el mapa; el chat y los gráficos sí funcionan.
            </p>
          </div>

          <Button variant="accent" className="mt-1 w-full py-3" disabled={!canSubmit} onClick={submit}>
            Entrar a la red
          </Button>
        </div>
      </div>
    </div>
  );
}
