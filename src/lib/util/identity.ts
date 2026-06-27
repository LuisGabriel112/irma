// Operator identity, persisted locally so a unit keeps its callsign across reloads.

import type { Affiliation } from "@/lib/types";

export interface Identity {
  id: string;
  callsign: string;
  team: string;
  affiliation: Affiliation; // how teammates see this unit on the net
  room: string; // default net / room code to join
  secret?: string; // shared passphrase for room E2E encryption (local only, never sent)
  symbol?: string; // MIL-STD-2525 function key broadcast to teammates (e.g. "inf")
  ready: boolean; // first-run setup completed
  lat?: number; // last known / hand-pinned position, restored across reloads
  lng?: number;
  posManual?: boolean; // position was hand-pinned — coarse GPS must not overwrite it
}

const KEY = "irma.identity";

const CALLSIGNS = [
  "RAVEN", "FALCON", "BISON", "COBRA", "GHOST", "ORION",
  "TITAN", "LYNX", "REAPER", "NOMAD", "SABER", "ATLAS",
];

export const TEAMS = ["Cyan", "Green", "Red", "Blue", "Orange", "Magenta"];

export function randomCallsign(): string {
  const word = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
  return `${word}-${1 + Math.floor(Math.random() * 9)}`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULTS: Omit<Identity, "id" | "callsign"> = {
  team: "Cyan",
  affiliation: "friend",
  room: "alfa",
  ready: false,
};

export function loadIdentity(): Identity {
  if (typeof window === "undefined") {
    return { id: "local", callsign: "RAVEN-1", ...DEFAULTS };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      // Merge over defaults so identities saved before these fields existed
      // (no affiliation/room/ready) still load and just re-run first-run setup.
      return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Identity>) } as Identity;
    }
  } catch {
    /* corrupt entry — regenerate */
  }
  const fresh: Identity = { id: newId(), callsign: randomCallsign(), ...DEFAULTS };
  saveIdentity(fresh);
  return fresh;
}

export function saveIdentity(identity: Identity): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* storage full / blocked — non-fatal */
  }
}

/** Wipe the stored identity (sign out). Next loadIdentity() mints a fresh one. */
export function clearIdentity(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
