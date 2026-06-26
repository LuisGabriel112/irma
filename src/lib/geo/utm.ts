/**
 * Minimal WGS84 <-> UTM conversion (Snyder series, sub-millimetre over the
 * usable band). Used to draw a true metric MGRS grid: we step in UTM easting/
 * northing and invert each node back to lat/lng so grid lines curve correctly.
 *
 * MGRS *labels* come from the `mgrs` package (handles the band/square letter
 * scheme); this module only supplies the numeric grid geometry.
 */

const A = 6378137.0; // WGS84 semi-major axis (m)
const F = 1 / 298.257223563; // flattening
const K0 = 0.9996; // UTM scale factor
const E2 = F * (2 - F); // first eccentricity squared
const EP2 = E2 / (1 - E2); // second eccentricity squared
const E1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export interface UTM {
  zone: number; // longitudinal zone 1..60
  north: boolean; // northern hemisphere
  e: number; // easting (m), false-easting 500k applied
  n: number; // northing (m), false-northing 10M applied in S hemisphere
}

export function utmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

/** Lat/lng -> UTM. Pass `forceZone` to keep a whole viewport in one zone. */
export function toUTM(lat: number, lng: number, forceZone?: number): UTM {
  const zone = forceZone ?? utmZone(lng);
  const lonOrigin = (zone - 1) * 6 - 180 + 3; // central meridian of the zone
  const φ = toRad(lat);
  const λ = toRad(lng) - toRad(lonOrigin);

  const N = A / Math.sqrt(1 - E2 * Math.sin(φ) ** 2);
  const T = Math.tan(φ) ** 2;
  const C = EP2 * Math.cos(φ) ** 2;
  const Acoef = Math.cos(φ) * λ;

  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256) * φ -
      ((3 * E2) / 8 + (3 * E2 ** 2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * φ) +
      ((15 * E2 ** 2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * φ) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * φ));

  const e =
    K0 *
      N *
      (Acoef +
        ((1 - T + C) * Acoef ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - 58 * EP2) * Acoef ** 5) / 120) +
    500000;

  let n =
    K0 *
    (M +
      N *
        Math.tan(φ) *
        (Acoef ** 2 / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * Acoef ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * EP2) * Acoef ** 6) / 720));

  if (lat < 0) n += 10000000; // false northing for the southern hemisphere
  return { zone, north: lat >= 0, e, n };
}

/** UTM -> lat/lng. */
export function fromUTM(u: UTM): { lat: number; lng: number } {
  const x = u.e - 500000;
  const y = u.north ? u.n : u.n - 10000000;
  const lonOrigin = (u.zone - 1) * 6 - 180 + 3;

  const M = y / K0;
  const mu =
    M / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));

  const φ1 =
    mu +
    ((3 * E1) / 2 - (27 * E1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * E1 ** 2) / 16 - (55 * E1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * E1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * E1 ** 4) / 512) * Math.sin(8 * mu);

  const N1 = A / Math.sqrt(1 - E2 * Math.sin(φ1) ** 2);
  const T1 = Math.tan(φ1) ** 2;
  const C1 = EP2 * Math.cos(φ1) ** 2;
  const R1 = (A * (1 - E2)) / (1 - E2 * Math.sin(φ1) ** 2) ** 1.5;
  const D = x / (N1 * K0);

  const lat =
    φ1 -
    ((N1 * Math.tan(φ1)) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * EP2 - 3 * C1 ** 2) * D ** 6) / 720);

  const lng =
    toRad(lonOrigin) +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * EP2 + 24 * T1 ** 2) * D ** 5) /
        120) /
      Math.cos(φ1);

  return { lat: toDeg(lat), lng: toDeg(lng) };
}
