import type { Affiliation, AlertType, CasevacSecurity, LatLng, MarkerType, MediaKind, UnitStatus } from "@/lib/types";

/**
 * IRMA wire protocol.
 *
 * Packets are serialized to compact JSON (short keys) and framed as a single
 * newline-terminated line. This keeps each frame inside a typical LoRa payload
 * budget (SF7-SF9 ~ 222 bytes usable) while staying trivially debuggable and
 * compatible with any serial/BLE LoRa bridge that forwards lines verbatim.
 *
 * For TAK interoperability, see `cot.ts` (Cursor-on-Target XML mapping).
 */

export const PROTOCOL_VERSION = 1;

/** Conservative usable application payload per LoRa frame (bytes). */
export const MAX_PAYLOAD_BYTES = 222;

export interface PositionPacket {
  kind: "position";
  id: string; // sender peer id
  callsign: string;
  affiliation: Affiliation;
  lat?: number; // omitted when the sender has no GPS fix yet (presence only)
  lng?: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  battery?: number;
  status?: UnitStatus;
  symbol?: string; // MIL-STD-2525 function key
  ts: number;
}

export interface MessagePacket {
  kind: "message";
  id: string; // message id
  from: string;
  to?: string; // undefined => broadcast
  text: string;
  ts: number;
}

export interface MarkerPacket {
  kind: "marker";
  id: string;
  markerType: MarkerType;
  affiliation: Affiliation;
  label?: string;
  coords: LatLng[];
  radius?: number; // meters, circle only
  color?: string;
  symbol?: string;
  remark?: string;
  geofence?: boolean;
  by: string;
  ts: number;
}

export interface MarkerDeletePacket {
  kind: "marker-delete";
  id: string;
  ts: number;
}

export interface PingPacket {
  kind: "ping";
  id: string;
  from: string;
  lat?: number;
  lng?: number;
  ts: number;
}

export interface AlertPacket {
  kind: "alert";
  id: string;
  from: string;
  alertType: AlertType;
  lat: number;
  lng: number;
  ts: number;
}

/**
 * WebRTC signaling envelope (SDP offer/answer or ICE candidate). Carries the
 * handshake for peer-to-peer live video; the media itself never touches the
 * relay. Several KB per frame — relay-only, never sent over a LoRa link.
 */
export type SignalBody =
  | RTCSessionDescriptionInit
  | { candidate: RTCIceCandidateInit };

export interface SignalPacket {
  kind: "signal";
  id: string;
  from: string; // sender peer id (self.id — stable routing key)
  to: string; // recipient peer id (signaling is always addressed)
  signal: SignalBody;
  ts: number;
}

/**
 * Chat attachment (image / voice clip). Far larger than a LoRa frame, so this
 * only travels over the WebSocket relay; the LoRa links never see it.
 */
export interface MediaPacket {
  kind: "media";
  id: string;
  from: string;
  to?: string;
  mediaKind: MediaKind;
  mime: string;
  data: string; // raw base64 (no data-URL prefix)
  caption?: string;
  dur?: number;
  ts: number;
}

/**
 * 9-line MEDEVAC/CASEVAC request. Several fields of text — larger than a LoRa
 * frame is comfortable with, so it travels over the relay, but the codec stays
 * compact so a short request can still squeeze onto a radio link.
 */
export interface CasevacPacket {
  kind: "casevac";
  id: string;
  from: string;
  lat: number;
  lng: number;
  freq?: string;
  urgent?: number;
  priority?: number;
  routine?: number;
  equipment?: string;
  litter?: number;
  ambulatory?: number;
  security?: CasevacSecurity;
  marking?: string;
  nationality?: string;
  notes?: string;
  ts: number;
}

export type Packet =
  | PositionPacket
  | MessagePacket
  | MarkerPacket
  | MarkerDeletePacket
  | PingPacket
  | AlertPacket
  | MediaPacket
  | SignalPacket
  | CasevacPacket;

// --- compact codec -------------------------------------------------------

const TYPE = { position: 0, message: 1, marker: 2, "marker-delete": 3, ping: 4, alert: 5, media: 6, signal: 7, casevac: 8 } as const;
const TYPE_REV = ["position", "message", "marker", "marker-delete", "ping", "alert", "media", "signal", "casevac"] as const;

const MK = { image: 0, audio: 1 } as const;
const MK_REV = ["image", "audio"] as const;

const AFF = { self: "s", friend: "f", neutral: "n", hostile: "h", unknown: "u" } as const;
const AFF_REV: Record<string, Affiliation> = {
  s: "self", f: "friend", n: "neutral", h: "hostile", u: "unknown",
};

const MT = { point: 0, line: 1, polygon: 2, circle: 3 } as const;
const MT_REV = ["point", "line", "polygon", "circle"] as const;

const ALT = { panic: 0, medical: 1, contact: 2 } as const;
const ALT_REV = ["panic", "medical", "contact"] as const;

const ST = { ok: 0, injured: 1, help: 2, offline: 3 } as const;
const ST_REV = ["ok", "injured", "help", "offline"] as const;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const r5 = (n: number) => Math.round(n * 1e5) / 1e5;

type Wire = Record<string, unknown>;

function toWire(p: Packet): Wire {
  switch (p.kind) {
    case "position": {
      const w: Wire = {
        t: TYPE.position, i: p.id, c: p.callsign, a: AFF[p.affiliation], ts: p.ts,
      };
      if (p.lat != null) w.la = r6(p.lat);
      if (p.lng != null) w.ln = r6(p.lng);
      if (p.heading != null) w.h = Math.round(p.heading);
      if (p.speed != null) w.s = Math.round(p.speed * 10) / 10;
      if (p.accuracy != null) w.ac = Math.round(p.accuracy);
      if (p.battery != null) w.b = Math.round(p.battery);
      if (p.status != null && p.status !== "ok") w.st = ST[p.status];
      if (p.symbol) w.sy = p.symbol;
      return w;
    }
    case "message": {
      const w: Wire = { t: TYPE.message, i: p.id, f: p.from, x: p.text, ts: p.ts };
      if (p.to) w.o = p.to;
      return w;
    }
    case "marker": {
      const w: Wire = {
        t: TYPE.marker, i: p.id, m: MT[p.markerType], a: AFF[p.affiliation],
        co: p.coords.map((c) => [r5(c.lat), r5(c.lng)]), by: p.by, ts: p.ts,
      };
      if (p.radius != null) w.rd = Math.round(p.radius);
      if (p.label) w.l = p.label;
      if (p.color) w.cl = p.color;
      if (p.symbol) w.sy = p.symbol;
      if (p.remark) w.r = p.remark;
      if (p.geofence) w.gf = 1;
      return w;
    }
    case "marker-delete":
      return { t: TYPE["marker-delete"], i: p.id, ts: p.ts };
    case "ping": {
      const w: Wire = { t: TYPE.ping, i: p.id, f: p.from, ts: p.ts };
      if (p.lat != null) w.la = r6(p.lat);
      if (p.lng != null) w.ln = r6(p.lng);
      return w;
    }
    case "alert":
      return {
        t: TYPE.alert, i: p.id, f: p.from, k: ALT[p.alertType],
        la: r6(p.lat), ln: r6(p.lng), ts: p.ts,
      };
    case "media": {
      const w: Wire = {
        t: TYPE.media, i: p.id, f: p.from, mk: MK[p.mediaKind],
        mm: p.mime, d: p.data, ts: p.ts,
      };
      if (p.to) w.o = p.to;
      if (p.caption) w.x = p.caption;
      if (p.dur != null) w.du = Math.round(p.dur * 10) / 10;
      return w;
    }
    case "signal":
      return { t: TYPE.signal, i: p.id, f: p.from, o: p.to, g: JSON.stringify(p.signal), ts: p.ts };
    case "casevac": {
      const w: Wire = { t: TYPE.casevac, i: p.id, f: p.from, la: r6(p.lat), ln: r6(p.lng), ts: p.ts };
      if (p.freq) w.fq = p.freq;
      if (p.urgent != null) w.u = p.urgent;
      if (p.priority != null) w.p = p.priority;
      if (p.routine != null) w.rt = p.routine;
      if (p.equipment) w.eq = p.equipment;
      if (p.litter != null) w.lt = p.litter;
      if (p.ambulatory != null) w.am = p.ambulatory;
      if (p.security) w.se = p.security;
      if (p.marking) w.mg = p.marking;
      if (p.nationality) w.na = p.nationality;
      if (p.notes) w.no = p.notes;
      return w;
    }
  }
}

function fromWire(w: Wire): Packet | null {
  const kind = TYPE_REV[w.t as number];
  if (!kind) return null;
  try {
    switch (kind) {
      case "position":
        return {
          kind, id: String(w.i), callsign: String(w.c),
          affiliation: AFF_REV[w.a as string] ?? "unknown",
          lat: w.la != null ? Number(w.la) : undefined,
          lng: w.ln != null ? Number(w.ln) : undefined,
          ts: Number(w.ts),
          heading: w.h != null ? Number(w.h) : undefined,
          speed: w.s != null ? Number(w.s) : undefined,
          accuracy: w.ac != null ? Number(w.ac) : undefined,
          battery: w.b != null ? Number(w.b) : undefined,
          status: w.st != null ? ST_REV[w.st as number] : undefined,
          symbol: w.sy != null ? String(w.sy) : undefined,
        };
      case "message":
        return {
          kind, id: String(w.i), from: String(w.f), text: String(w.x),
          to: w.o != null ? String(w.o) : undefined, ts: Number(w.ts),
        };
      case "marker":
        return {
          kind, id: String(w.i),
          markerType: MT_REV[w.m as number] ?? "point",
          affiliation: AFF_REV[w.a as string] ?? "unknown",
          coords: (w.co as [number, number][]).map(([lat, lng]) => ({ lat, lng })),
          radius: w.rd != null ? Number(w.rd) : undefined,
          label: w.l != null ? String(w.l) : undefined,
          color: w.cl != null ? String(w.cl) : undefined,
          symbol: w.sy != null ? String(w.sy) : undefined,
          remark: w.r != null ? String(w.r) : undefined,
          geofence: w.gf === 1 ? true : undefined,
          by: String(w.by), ts: Number(w.ts),
        };
      case "marker-delete":
        return { kind, id: String(w.i), ts: Number(w.ts) };
      case "ping":
        return {
          kind, id: String(w.i), from: String(w.f), ts: Number(w.ts),
          lat: w.la != null ? Number(w.la) : undefined,
          lng: w.ln != null ? Number(w.ln) : undefined,
        };
      case "alert":
        return {
          kind, id: String(w.i), from: String(w.f),
          alertType: ALT_REV[w.k as number] ?? "panic",
          lat: Number(w.la), lng: Number(w.ln), ts: Number(w.ts),
        };
      case "media":
        return {
          kind, id: String(w.i), from: String(w.f),
          mediaKind: MK_REV[w.mk as number] ?? "image",
          mime: String(w.mm), data: String(w.d),
          to: w.o != null ? String(w.o) : undefined,
          caption: w.x != null ? String(w.x) : undefined,
          dur: w.du != null ? Number(w.du) : undefined,
          ts: Number(w.ts),
        };
      case "signal":
        return {
          kind, id: String(w.i), from: String(w.f), to: String(w.o),
          signal: JSON.parse(String(w.g)) as SignalBody, ts: Number(w.ts),
        };
      case "casevac":
        return {
          kind, id: String(w.i), from: String(w.f),
          lat: Number(w.la), lng: Number(w.ln), ts: Number(w.ts),
          freq: w.fq != null ? String(w.fq) : undefined,
          urgent: w.u != null ? Number(w.u) : undefined,
          priority: w.p != null ? Number(w.p) : undefined,
          routine: w.rt != null ? Number(w.rt) : undefined,
          equipment: w.eq != null ? String(w.eq) : undefined,
          litter: w.lt != null ? Number(w.lt) : undefined,
          ambulatory: w.am != null ? Number(w.am) : undefined,
          security: w.se != null ? (String(w.se) as CasevacSecurity) : undefined,
          marking: w.mg != null ? String(w.mg) : undefined,
          nationality: w.na != null ? String(w.na) : undefined,
          notes: w.no != null ? String(w.no) : undefined,
        };
    }
  } catch {
    return null;
  }
  return null;
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Serialize a packet to a single wire line (no trailing newline). */
export function encode(p: Packet): string {
  return JSON.stringify(toWire(p));
}

/** Parse one wire line back into a packet, or null if malformed. */
export function decode(line: string): Packet | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let obj: Wire;
  try {
    obj = JSON.parse(trimmed) as Wire;
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj == null || typeof obj.t !== "number") return null;
  return fromWire(obj);
}

/** True if the encoded packet fits within one LoRa frame. */
export function fitsInFrame(p: Packet): boolean {
  return byteLength(encode(p)) <= MAX_PAYLOAD_BYTES;
}
