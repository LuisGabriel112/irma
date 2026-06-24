import type { LatLng } from "@/lib/types";

const R_EARTH = 6371008.8; // mean Earth radius, meters
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing a -> b, degrees 0..360 (0 = north). */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 16-point compass label for a bearing. */
export function compass(deg: number): string {
  // Spanish compass points (O = Oeste / West)
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function formatLatLng(lat: number, lng: number, digits = 5): string {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`;
}

/** Lat/Lng in degrees-decimal-minutes with hemisphere, e.g. "19°25.6'N 099°08.1'W". */
export function formatLatLngDM(lat: number, lng: number): string {
  const fmt = (v: number, pos: string, neg: string, pad: number) => {
    const h = v >= 0 ? pos : neg;
    const abs = Math.abs(v);
    const d = Math.floor(abs);
    const m = (abs - d) * 60;
    return `${String(d).padStart(pad, "0")}°${m.toFixed(1).padStart(4, "0")}'${h}`;
  };
  return `${fmt(lat, "N", "S", 2)} ${fmt(lng, "E", "W", 3)}`;
}

export function formatDistance(m: number): string {
  if (!isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(2)} km`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatSpeed(mps?: number): string {
  if (mps == null || !isFinite(mps)) return "—";
  const kmh = mps * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatRelTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "ahora";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Project a point `dist` meters at `brng` degrees from origin. Used by the simulator. */
export function destination(origin: LatLng, dist: number, brng: number): LatLng {
  const d = dist / R_EARTH;
  const b = toRad(brng);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 };
}
