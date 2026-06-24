// Core domain model shared across transport, protocol, store and UI.

export type Affiliation = "self" | "friend" | "neutral" | "hostile" | "unknown";

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
  team?: string;
  lastSeen: number; // epoch ms
}

export type MarkerType = "point" | "line" | "polygon";

/** A drawn/placed graphic on the map, shareable over the mesh. */
export interface Marker {
  id: string;
  type: MarkerType;
  affiliation: Affiliation;
  label?: string;
  coords: LatLng[]; // length 1 for point
  color?: string; // hex; defaults derived from affiliation
  symbol?: string; // icon key for points
  remark?: string;
  createdBy: string; // callsign
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  from: string; // callsign
  to?: string; // callsign, or undefined => broadcast
  text: string;
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
