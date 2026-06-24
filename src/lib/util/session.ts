// Operator-authored content (tactical graphics + chat), persisted locally so a
// reload doesn't wipe the working picture. Peers are intentionally NOT persisted:
// they are ephemeral, re-acquired from the live net, and restoring them would
// ghost stale units on the map.

import type { ChatMessage, Marker } from "@/lib/types";

const KEY = "irma.session";

export interface Session {
  markers: Record<string, Marker>;
  messages: ChatMessage[];
}

const EMPTY: Session = { markers: {}, messages: [] };

export function loadSession(): Session {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Session>;
    return {
      markers: parsed.markers ?? {},
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return EMPTY; // corrupt entry — start clean
  }
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage full / blocked — non-fatal */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
