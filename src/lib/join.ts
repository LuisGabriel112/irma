/**
 * Net join links. A QR (or plain link) encodes the room + shared passphrase
 * (+ optional relay URL) so a teammate can join the same encrypted net by
 * scanning it with their phone camera — no manual typing of the secret.
 *
 * The payload is a base64url JSON blob on the `?join=` query of the app URL, so
 * a native camera scan opens the app and pre-fills setup directly.
 */

export interface JoinPayload {
  room: string;
  secret?: string;
  relay?: string;
}

function b64urlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return decodeURIComponent(escape(atob(b64)));
}

/** Build the absolute join URL for a payload (uses the current origin). */
export function buildJoinUrl(payload: JoinPayload): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const blob = b64urlEncode(JSON.stringify(payload));
  return `${origin}/?join=${blob}`;
}

/** Parse a join blob (the `?join=` value, or a full URL containing it). */
export function parseJoin(raw: string): JoinPayload | null {
  try {
    let blob = raw.trim();
    if (blob.includes("join=")) blob = blob.split("join=")[1].split(/[&#]/)[0];
    const obj = JSON.parse(b64urlDecode(blob)) as Partial<JoinPayload>;
    if (!obj || typeof obj.room !== "string" || !obj.room) return null;
    return {
      room: obj.room.slice(0, 24),
      secret: typeof obj.secret === "string" ? obj.secret : undefined,
      relay: typeof obj.relay === "string" ? obj.relay : undefined,
    };
  } catch {
    return null;
  }
}

/** Read a join payload from the current URL's `?join=`, if present. */
export function joinFromLocation(): JoinPayload | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("join");
  return v ? parseJoin(v) : null;
}
