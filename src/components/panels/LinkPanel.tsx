"use client";

import { useEffect, useState } from "react";
import { Bluetooth, Cpu, Globe, LogOut, Plug, PlugZap, Usb } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { Button, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/util/cn";
import { TEAMS } from "@/lib/util/identity";
import {
  STATE_LABELS,
  TRANSPORT_LABELS,
  transportSupported,
  type TransportKind,
} from "@/lib/transport/types";

const OPTIONS: Array<{ kind: TransportKind; icon: React.ReactNode; hint: string }> = [
  { kind: "simulated", icon: <Cpu className="h-4 w-4" />, hint: "Roster demo, sin hardware" },
  { kind: "websocket", icon: <Globe className="h-4 w-4" />, hint: "Amigos por internet (relay + sala)" },
  { kind: "serial", icon: <Usb className="h-4 w-4" />, hint: "Puente LoRa USB (Web Serial)" },
  { kind: "bluetooth", icon: <Bluetooth className="h-4 w-4" />, hint: "Puente LoRa BLE (NUS)" },
];

const DEFAULT_RELAY = process.env.NEXT_PUBLIC_RELAY_URL ?? "ws://localhost:1234";

const STATE_COLOR = {
  connected: "text-tac-accent",
  connecting: "text-tac-warn",
  error: "text-tac-danger",
  disconnected: "text-tac-muted",
} as const;

export function LinkPanel() {
  const self = useStore((s) => s.self);
  const setCallsign = useStore((s) => s.setCallsign);
  const setTeam = useStore((s) => s.setTeam);
  const connection = useStore((s) => s.connection);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const log = useStore((s) => s.log);

  const editIdentity = useStore((s) => s.editIdentity);
  const logout = useStore((s) => s.logout);

  const [selected, setSelected] = useState<TransportKind>("websocket");
  const [baud, setBaud] = useState(115200);
  const [room, setRoom] = useState(self.room);
  const [relayUrl, setRelayUrl] = useState(DEFAULT_RELAY);
  const [callsign, setCallsignDraft] = useState(self.callsign);

  // Keep the fields in sync when identity is hydrated from localStorage post-mount.
  useEffect(() => {
    setCallsignDraft(self.callsign);
  }, [self.callsign]);
  useEffect(() => {
    setRoom(self.room);
  }, [self.room]);

  const isConnected = connection.state === "connected" || connection.state === "connecting";
  const activeKind = connection.kind;

  const onConnect = async () => {
    try {
      await connect(selected, { baudRate: baud, room, url: relayUrl });
    } catch {
      /* error reflejado en connection.info + registro */
    }
  };

  return (
    <div className="flex flex-col gap-1 overflow-y-auto pb-3">
      <SectionTitle>Operador</SectionTitle>
      <div className="grid grid-cols-2 gap-2 px-3 pb-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-tac-muted">Indicativo</span>
          <input
            value={callsign}
            onChange={(e) => setCallsignDraft(e.target.value)}
            onBlur={() => setCallsign(callsign)}
            onKeyDown={(e) => e.key === "Enter" && setCallsign(callsign)}
            maxLength={16}
            className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1.5 font-mono text-sm uppercase text-tac-text focus:border-tac-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-tac-muted">Equipo</span>
          <select
            value={self.team}
            onChange={(e) => setTeam(e.target.value)}
            className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1.5 text-sm text-tac-text focus:border-tac-accent focus:outline-none"
          >
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between px-3 pb-1">
        <Button variant="ghost" className="px-1 text-[10px]" onClick={editIdentity}>
          Cambiar identidad / posición
        </Button>
        <Button
          variant="ghost"
          className="px-1 text-[10px] text-tac-danger hover:text-tac-danger"
          onClick={() => {
            if (window.confirm("¿Cerrar sesión? Se borra tu identidad de este dispositivo.")) {
              void logout();
            }
          }}
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </Button>
      </div>

      <SectionTitle>Enlace de malla</SectionTitle>
      <div className="flex flex-col gap-1.5 px-3">
        {OPTIONS.map((o) => {
          const supported = transportSupported(o.kind);
          const active = isConnected && activeKind === o.kind;
          return (
            <button
              key={o.kind}
              type="button"
              disabled={!supported || isConnected}
              onClick={() => setSelected(o.kind)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-tac)] border px-3 py-2 text-left transition-colors",
                selected === o.kind && !isConnected
                  ? "border-tac-accent bg-tac-accent/10"
                  : "border-tac-line hover:border-tac-muted",
                active && "border-tac-accent bg-tac-accent/10",
                (!supported || (isConnected && !active)) && "opacity-40",
              )}
            >
              <span className="text-tac-accent">{o.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-tac-text">
                  {TRANSPORT_LABELS[o.kind]}
                </span>
                <span className="block text-[11px] text-tac-muted">
                  {supported ? o.hint : "No soportado en este navegador"}
                </span>
              </span>
              {active && <span className="h-2 w-2 rounded-full bg-tac-accent shadow-[0_0_6px_#3ddc84]" />}
            </button>
          );
        })}

        {selected === "serial" && !isConnected && (
          <label className="flex items-center justify-between px-1 py-1 text-[11px] text-tac-muted">
            Baudios
            <input
              type="number"
              value={baud}
              onChange={(e) => setBaud(Number(e.target.value) || 115200)}
              className="w-24 rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1 text-right font-mono text-tac-text focus:border-tac-accent focus:outline-none"
            />
          </label>
        )}

        {selected === "websocket" && !isConnected && (
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-tac-muted">
                Código de sala
              </span>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.trim().toLowerCase())}
                maxLength={24}
                placeholder="alfa"
                className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1.5 font-mono text-sm lowercase text-tac-text focus:border-tac-accent focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-tac-muted">Relay</span>
              <input
                value={relayUrl}
                onChange={(e) => setRelayUrl(e.target.value.trim())}
                placeholder="wss://tu-relay.example"
                className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1.5 font-mono text-[11px] text-tac-text focus:border-tac-accent focus:outline-none"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-tac-muted">
              Comparte el <span className="text-tac-text">código de sala</span> con tu equipo.
              Todos en la misma sala se ven en el mapa.
            </p>
          </div>
        )}
      </div>

      <div className="px-3 pt-2">
        {isConnected ? (
          <Button variant="danger" className="w-full" onClick={() => disconnect()}>
            <Plug className="h-4 w-4" /> Desconectar
          </Button>
        ) : (
          <Button
            variant="accent"
            className="w-full"
            disabled={
              !transportSupported(selected) ||
              (selected === "websocket" && (!room || !relayUrl))
            }
            onClick={onConnect}
          >
            <PlugZap className="h-4 w-4" /> Conectar {TRANSPORT_LABELS[selected]}
          </Button>
        )}
        <div className={cn("mt-2 text-center font-mono text-[11px]", STATE_COLOR[connection.state])}>
          {STATE_LABELS[connection.state]}
          {connection.info ? ` · ${connection.info}` : ""}
        </div>
      </div>

      <SectionTitle>Registro de enlace</SectionTitle>
      <div className="mx-3 h-28 overflow-y-auto rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg p-2 font-mono text-[10px] leading-relaxed text-tac-muted">
        {log.length === 0 ? <span className="opacity-50">—</span> : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      <p className="px-3 pt-3 text-[11px] leading-relaxed text-tac-muted/80">
        Los enlaces LoRa se conectan a través de un puente de radio USB/BLE que
        retransmite paquetes delimitados por salto de línea a la malla. Consulta el
        README para el firmware de referencia.
      </p>
    </div>
  );
}
