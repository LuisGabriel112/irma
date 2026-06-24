import { BaseTransport } from "@/lib/transport/base";
import type { ConnectOptions, TransportKind } from "@/lib/transport/types";
import type { Affiliation, LatLng } from "@/lib/types";
import { destination } from "@/lib/geo/utils";
import { encode, type Packet } from "@/lib/protocol/packet";

interface SimPeer {
  id: string;
  callsign: string;
  affiliation: Affiliation;
  pos: LatLng;
  heading: number;
  speed: number; // m/s
  battery: number;
}

const ROSTER: Array<Pick<SimPeer, "callsign" | "affiliation" | "speed">> = [
  { callsign: "HAWK-2", affiliation: "friend", speed: 2.2 },
  { callsign: "WOLF-3", affiliation: "friend", speed: 1.6 },
  { callsign: "MEDIC-7", affiliation: "friend", speed: 1.1 },
  { callsign: "VIPER-6", affiliation: "hostile", speed: 3.0 },
  { callsign: "CIV-DELTA", affiliation: "neutral", speed: 0.8 },
];

const TICK_MS = 2000;

/**
 * In-app simulated mesh — no hardware required. Spawns a moving roster around
 * the operator and emits the same wire frames a real LoRa link would deliver,
 * so the entire receive path (decode -> store -> map) is exercised for demos.
 */
export class SimulatedTransport extends BaseTransport {
  readonly kind: TransportKind = "simulated";
  private peers: SimPeer[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private center: LatLng = { lat: 19.4326, lng: -99.1332 };

  async connect(opts?: ConnectOptions): Promise<void> {
    if (opts?.center) this.center = opts.center;
    this.setState("connecting");
    this.peers = ROSTER.map((r, i) => ({
      id: `sim-${r.callsign}`,
      callsign: r.callsign,
      affiliation: r.affiliation,
      pos: destination(this.center, 150 + i * 110, (i * 67) % 360),
      heading: (i * 67) % 360,
      speed: r.speed,
      battery: 70 + Math.floor(Math.random() * 30),
    }));
    this.setState("connected", `${this.peers.length} simulated units`);
    this.log(`Simulated mesh up — ${this.peers.length} units`);

    // Seed a hostile contact marker and a couple of radio messages.
    setTimeout(() => this.emitHostileMarker(), 800);
    setTimeout(() => this.emitChat("HAWK-2", "En posición, vigilancia establecida."), 1500);
    setTimeout(() => this.emitChat("MEDIC-7", "Punto de recogida de bajas marcado."), 4000);

    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    const now = Date.now();
    for (const p of this.peers) {
      p.heading = (p.heading + (Math.random() - 0.5) * 30 + 360) % 360;
      p.pos = destination(p.pos, p.speed * (TICK_MS / 1000), p.heading);
      p.battery = Math.max(2, p.battery - Math.random() * 0.05);
      this.emit({
        kind: "position",
        id: p.id,
        callsign: p.callsign,
        affiliation: p.affiliation,
        lat: p.pos.lat,
        lng: p.pos.lng,
        heading: p.heading,
        speed: p.speed,
        accuracy: 5 + Math.random() * 8,
        battery: Math.round(p.battery),
        ts: now,
      });
    }
  }

  private emitHostileMarker(): void {
    const at = destination(this.center, 420, 120);
    this.emit({
      kind: "marker",
      id: "sim-marker-1",
      markerType: "point",
      affiliation: "hostile",
      label: "Contacto",
      coords: [at],
      remark: "2 a pie, vistos moviéndose al E",
      by: "VIPER-6",
      ts: Date.now(),
    });
  }

  private emitChat(from: string, text: string): void {
    this.emit({
      kind: "message",
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from,
      text,
      ts: Date.now(),
    });
  }

  private emit(packet: Packet): void {
    this.cb.onLine(encode(packet));
  }

  async send(_line: string): Promise<void> {
    // Loopback sink: the simulator has no uplink. Real peers would receive this.
    void _line;
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.peers = [];
    this.setState("disconnected");
  }
}
