import type { LatLng } from "@/lib/types";

export type TransportState = "disconnected" | "connecting" | "connected" | "error";
export type TransportKind = "simulated" | "serial" | "bluetooth" | "websocket";

export interface TransportCallbacks {
  /** A complete newline-delimited packet line was received. */
  onLine: (line: string) => void;
  onState: (state: TransportState, info?: string) => void;
  onLog: (msg: string) => void;
}

export interface ConnectOptions {
  center?: LatLng; // simulated transport spawn center
  baudRate?: number; // serial
  url?: string; // websocket relay base URL
  room?: string; // websocket room / net code — peers in the same room see each other
}

export interface Transport {
  readonly kind: TransportKind;
  getState(): TransportState;
  connect(opts?: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  send(line: string): Promise<void>;
}

export const TRANSPORT_LABELS: Record<TransportKind, string> = {
  simulated: "Malla simulada",
  serial: "LoRa · USB serie",
  bluetooth: "LoRa · Bluetooth",
  websocket: "Internet · relay",
};

export const STATE_LABELS: Record<TransportState, string> = {
  disconnected: "DESCONECTADO",
  connecting: "CONECTANDO",
  connected: "CONECTADO",
  error: "ERROR",
};

/** Runtime capability probe for a transport (Web Serial / Web Bluetooth gating). */
export function transportSupported(kind: TransportKind): boolean {
  if (typeof navigator === "undefined") return kind === "simulated";
  switch (kind) {
    case "simulated":
      return true;
    case "serial":
      return "serial" in navigator;
    case "bluetooth":
      return "bluetooth" in navigator;
    case "websocket":
      return typeof WebSocket !== "undefined";
  }
}
