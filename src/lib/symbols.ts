/**
 * MIL-STD-2525C military symbology, rendered via the `milsymbol` library.
 *
 * Markers store a 15-char SIDC in `Marker.symbol`. The 2nd character is the
 * standard identity (affiliation); we override it from the marker/unit's own
 * affiliation at render time so one palette entry works for any side. Rendered
 * SVGs are memoised — the same symbol is drawn for every matching unit on every
 * map refresh.
 */

import ms from "milsymbol";
import type { Affiliation } from "@/lib/types";

export interface SymbolDef {
  key: string;
  label: string;
  sidc: string; // friend-framed base; affiliation is swapped at render time
}

// Curated set of common ground symbols (function id in SIDC positions 5-10).
export const SYMBOL_PALETTE: SymbolDef[] = [
  { key: "unit", label: "Unidad", sidc: "SFGPU----------" },
  { key: "inf", label: "Infantería", sidc: "SFGPUCI--------" },
  { key: "armor", label: "Blindado", sidc: "SFGPUCA--------" },
  { key: "recon", label: "Reconocimiento", sidc: "SFGPUCR--------" },
  { key: "arty", label: "Artillería", sidc: "SFGPUCF--------" },
  { key: "mortar", label: "Mortero", sidc: "SFGPUCFML------" },
  { key: "aa", label: "Antiaéreo", sidc: "SFGPUCD--------" },
  { key: "eng", label: "Ingenieros", sidc: "SFGPUCE--------" },
  { key: "med", label: "Médico", sidc: "SFGPUS---------" },
  { key: "log", label: "Logística", sidc: "SFGPUSS--------" },
  { key: "hq", label: "Puesto mando", sidc: "SFGPUH---------" },
  { key: "veh", label: "Vehículo", sidc: "SFGPEV---------" },
  { key: "air", label: "Aeronave", sidc: "SFAPMF---------" },
];

const AFF_CHAR: Record<Affiliation, string> = {
  self: "F",
  friend: "F",
  neutral: "N",
  hostile: "H",
  unknown: "U",
};

/** Generic "unit" symbol for a side — the default when no symbol was chosen. */
export function defaultSidc(aff: Affiliation): string {
  return applyAffiliation("SFGPU----------", aff);
}

/** Force the standard-identity (affiliation) character of a SIDC. */
export function applyAffiliation(sidc: string, aff: Affiliation): string {
  const padded = (sidc + "---------------").slice(0, 15);
  return padded[0] + AFF_CHAR[aff] + padded.slice(2);
}

export interface RenderedSymbol {
  svg: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const cache = new Map<string, RenderedSymbol>();

/** Render a SIDC to an SVG string + geometry, memoised by sidc+size. */
export function renderSymbol(sidc: string, size = 28): RenderedSymbol {
  const ck = `${sidc}@${size}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const sym = new ms.Symbol(sidc, { size });
  const dim = sym.getSize();
  const anchor = sym.getAnchor();
  const out: RenderedSymbol = {
    svg: sym.asSVG(),
    width: dim.width,
    height: dim.height,
    anchorX: anchor.x,
    anchorY: anchor.y,
  };
  cache.set(ck, out);
  return out;
}
