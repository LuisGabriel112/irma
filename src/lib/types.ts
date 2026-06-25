// Core domain model shared across transport, protocol, store and UI.

export type Affiliation = "self" | "friend" | "neutral" | "hostile" | "unknown";

/** Operational status a unit reports alongside its position. */
export type UnitStatus = "ok" | "injured" | "help" | "offline";

export const STATUS_LABELS: Record<UnitStatus, string> = {
  ok: "OK",
  injured: "HERIDO",
  help: "AYUDA",
  offline: "FUERA",
};

export const STATUS_COLORS: Record<UnitStatus, string> = {
  ok: "#3ddc84",
  injured: "#ff4d4d",
  help: "#ffb020",
  offline: "#7c8b84",
};

export interface LatLng {
  lat: number;
  lng: number;
}

/** A tracked unit (own force or received over the mesh). */
export interface Peer {
  id: string;
  callsign: string;
  affiliation: Affiliation;
  lat: number;
  lng: number;
  heading?: number; // degrees, 0 = north
  speed?: number; // m/s
  accuracy?: number; // meters (GPS CE)
  battery?: number; // 0-100
  status?: UnitStatus; // self-reported operational status
  team?: string;
  lastSeen: number; // epoch ms
}

export type MarkerType = "point" | "line" | "polygon" | "circle";

/** A drawn/placed graphic on the map, shareable over the mesh. */
export interface Marker {
  id: string;
  type: MarkerType;
  affiliation: Affiliation;
  label?: string;
  coords: LatLng[]; // length 1 for point/circle (center), >=2 for line/polygon
  radius?: number; // meters, circle only
  color?: string; // hex; defaults derived from affiliation
  symbol?: string; // icon key for points
  remark?: string;
  createdBy: string; // callsign
  createdAt: number;
}

export type AlertType = "panic" | "medical" | "contact";

/** A distress/alert broadcast — flashes on every teammate's map until cleared. */
export interface Alert {
  id: string;
  from: string; // callsign
  type: AlertType;
  lat: number;
  lng: number;
  ts: number;
}

export const ALERT_LABELS: Record<AlertType, string> = {
  panic: "PÁNICO",
  medical: "MÉDICO",
  contact: "CONTACTO",
};

export type MediaKind = "image" | "audio";

/** An attachment on a chat message. Relay-only (too large for LoRa frames). */
export interface ChatMedia {
  kind: MediaKind;
  data: string; // data URL: `data:<mime>;base64,<...>`
  mime: string;
  dur?: number; // audio length, seconds
}

export interface ChatMessage {
  id: string;
  from: string; // callsign
  to?: string; // callsign, or undefined => broadcast
  text: string;
  media?: ChatMedia; // image / voice clip (relay transport only)
  ts: number;
  self?: boolean;
}

export const AFFILIATION_COLORS: Record<Affiliation, string> = {
  self: "#3ddc84",
  friend: "#38bdf8",
  neutral: "#cbd5cf",
  hostile: "#ff4d4d",
  unknown: "#ffb020",
};

export const AFFILIATION_LABELS: Record<Affiliation, string> = {
  self: "PROPIO",
  friend: "ALIADO",
  neutral: "NEUTRAL",
  hostile: "HOSTIL",
  unknown: "DESCONOCIDO",
};
