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
  patrol?: boolean; // moves on a fixed sweep that crosses the demo geofence
}

const ROSTER: Array<Pick<SimPeer, "callsign" | "affiliation" | "speed">> = [
  { callsign: "HAWK-2", affiliation: "friend", speed: 2.2 },
  { callsign: "WOLF-3", affiliation: "friend", speed: 1.6 },
  { callsign: "MEDIC-7", affiliation: "friend", speed: 1.1 },
  { callsign: "VIPER-6", affiliation: "hostile", speed: 3.0 },
  { callsign: "CIV-DELTA", affiliation: "neutral", speed: 0.8 },
];

const TICK_MS = 2000;
const FENCE_R = 220; // demo geofence radius (m), centred on the operator

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
  private ticks = 0;

  async connect(opts?: ConnectOptions): Promise<void> {
    if (opts?.center) this.center = opts.center;
    this.setState("connecting");
    this.ticks = 0;
    this.peers = ROSTER.map((r, i) => ({
      id: `sim-${r.callsign}`,
      callsign: r.callsign,
      affiliation: r.affiliation,
      pos: destination(this.center, 150 + i * 110, (i * 67) % 360),
      heading: (i * 67) % 360,
      speed: r.speed,
      battery: 70 + Math.floor(Math.random() * 30),
    }));
    // A patrol unit on a fixed radial sweep that crosses the demo geofence,
    // so the breach banner / beep / pulse fire on a predictable cadence.
    this.peers.push({
      id: "sim-PATROL-9",
      callsign: "PATROL-9",
      affiliation: "friend",
      pos: this.center,
      heading: 0,
      speed: 2.5,
      battery: 88,
      patrol: true,
    });
    this.setState("connected", `${this.peers.length} simulated units`);
    this.log(`Simulated mesh up — ${this.peers.length} units`);

    // Seed a hostile contact marker, a demo geofence and a couple of messages.
    setTimeout(() => this.emitHostileMarker(), 800);
    setTimeout(() => this.emitGeofence(), 1000);
    setTimeout(() => this.emitChat("HAWK-2", "En posición, vigilancia establecida."), 1500);
    setTimeout(() => this.emitChat("MEDIC-7", "Punto de recogida de bajas marcado."), 4000);

    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    const now = Date.now();
    this.ticks++;
    for (const p of this.peers) {
      if (p.patrol) {
        // Radius sweeps ~70..370 m around the fence (220 m), so it crosses the
        // boundary twice per sine period (~every ~35 s) while orbiting.
        const angle = (this.ticks * 11) % 360;
        const radius = Math.max(30, FENCE_R + 150 * Math.sin(this.ticks / 6));
        p.pos = destination(this.center, radius, angle);
        p.heading = (angle + 90) % 360;
      } else {
        p.heading = (p.heading + (Math.random() - 0.5) * 30 + 360) % 360;
        p.pos = destination(p.pos, p.speed * (TICK_MS / 1000), p.heading);
      }
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

  private emitGeofence(): void {
    this.emit({
      kind: "marker",
      id: "sim-fence-1",
      markerType: "circle",
      affiliation: "friend",
      label: "ZONA ALFA",
      coords: [this.center],
      radius: FENCE_R,
      geofence: true,
      remark: "Geocerca de demostración",
      by: "HAWK-2",
      ts: Date.now(),
    });
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
