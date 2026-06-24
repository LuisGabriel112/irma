import type { Affiliation } from "@/lib/types";
import type { PositionPacket } from "@/lib/protocol/packet";

/**
 * Cursor-on-Target (CoT) interop — best-effort mapping between IRMA position
 * packets and the TAK ecosystem's CoT XML events. Lets IRMA bridge to / from
 * ATAK / WinTAK / TAK Server when a richer link than LoRa is available.
 */

const AFF_TO_COT: Record<Affiliation, string> = {
  self: "a-f-G-U-C",
  friend: "a-f-G",
  neutral: "a-n-G",
  hostile: "a-h-G",
  unknown: "a-u-G",
};

function cotAffiliation(type: string): Affiliation {
  const a = type.split("-")[1];
  if (a === "f") return "friend";
  if (a === "h") return "hostile";
  if (a === "n") return "neutral";
  return "unknown";
}

const iso = (ms: number) => new Date(ms).toISOString();

export function positionToCoT(p: PositionPacket, staleSeconds = 60): string {
  const now = p.ts;
  const ce = p.accuracy ?? 9999999;
  const track =
    p.heading != null || p.speed != null
      ? `<track course="${p.heading ?? 0}" speed="${p.speed ?? 0}"/>`
      : "";
  const battery = p.battery != null ? `<status battery="${p.battery}"/>` : "";
  return (
    `<?xml version="1.0" standalone="yes"?>` +
    `<event version="2.0" uid="${p.id}" type="${AFF_TO_COT[p.affiliation]}" ` +
    `how="m-g" time="${iso(now)}" start="${iso(now)}" stale="${iso(now + staleSeconds * 1000)}">` +
    `<point lat="${p.lat}" lon="${p.lng}" hae="0.0" ce="${ce}" le="9999999"/>` +
    `<detail>` +
    `<contact callsign="${escapeXml(p.callsign)}"/>` +
    `<__group name="Cyan" role="Team Member"/>` +
    track +
    battery +
    `</detail>` +
    `</event>`
  );
}

/** Parse a CoT event into a PositionPacket (browser DOMParser). */
export function cotToPosition(xml: string): PositionPacket | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) return null;
    const event = doc.querySelector("event");
    const point = doc.querySelector("point");
    if (!event || !point) return null;
    const id = event.getAttribute("uid") ?? crypto.randomUUID();
    const type = event.getAttribute("type") ?? "a-u-G";
    const callsign =
      doc.querySelector("contact")?.getAttribute("callsign") ?? id.slice(0, 6);
    const track = doc.querySelector("track");
    const status = doc.querySelector("status");
    const ce = Number(point.getAttribute("ce"));
    return {
      kind: "position",
      id,
      callsign,
      affiliation: cotAffiliation(type),
      lat: Number(point.getAttribute("lat")),
      lng: Number(point.getAttribute("lon")),
      heading: track ? Number(track.getAttribute("course")) : undefined,
      speed: track ? Number(track.getAttribute("speed")) : undefined,
      accuracy: isFinite(ce) && ce < 9999999 ? ce : undefined,
      battery: status ? Number(status.getAttribute("battery")) : undefined,
      ts: Date.parse(event.getAttribute("time") ?? "") || Date.now(),
    };
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}
