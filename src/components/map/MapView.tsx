"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useStore, type Tool } from "@/lib/store/useStore";
import {
  AFFILIATION_COLORS,
  AFFILIATION_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Affiliation,
  type LatLng,
} from "@/lib/types";
import { formatDistance, formatGrid, formatRelTime, haversine } from "@/lib/geo/utils";
import { fromUTM, toUTM, utmZone } from "@/lib/geo/utm";
import { PeerVideoOverlay } from "@/components/map/PeerVideoOverlay";

/**
 * Leaflet renderer. Raster tiles are plain <img> elements (no WebGL), so the
 * map works in any environment — including GPU-less VMs / remote desktops where
 * a WebGL map renders black. Vector layers (unit/marker dots) render as SVG DOM
 * (the Leaflet default): no 2D-canvas renderer, which avoids the canvas redraw
 * that races React Strict Mode's dev double-mount (the `clearRect` crash).
 */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>';
const STALE_MS = 30_000;
const DEFAULT_CENTER: [number, number] = [19.1738, -96.1342]; // Veracruz
// Max accuracy (m) for a first GPS fix to auto-center the map. IP/wifi geolocation
// on VMs returns ~10km — above this we keep DEFAULT_CENTER and warn instead.
const FIRST_FIX_MAX_ACCURACY_M = 500;

function affiliationOf(tool: Tool): Affiliation {
  if (tool === "marker-friend") return "friend";
  if (tool === "marker-hostile") return "hostile";
  if (tool === "marker-neutral") return "neutral";
  return "unknown";
}

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!,
  );
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const peersLayerRef = useRef<L.LayerGroup | null>(null);
  const trailsLayerRef = useRef<L.LayerGroup | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const measureLayerRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const navLayerRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerRef = useRef<L.LayerGroup | null>(null);
  const measureRef = useRef<LatLng[]>([]);
  const firstFixRef = useRef(false);
  const coarseFixWarnedRef = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const peers = useStore((s) => s.peers);
  const trails = useStore((s) => s.trails);
  const trailsOn = useStore((s) => s.trailsOn);
  const gridOn = useStore((s) => s.gridOn);
  const markers = useStore((s) => s.markers);
  const fenceFlash = useStore((s) => s.fenceFlash);
  const alerts = useStore((s) => s.alerts);
  const draft = useStore((s) => s.draft);
  const navTargetId = useStore((s) => s.navTargetId);
  const selfLat = useStore((s) => s.self.lat);
  const selfLng = useStore((s) => s.self.lng);
  const selfHeading = useStore((s) => s.self.heading);
  const selfAccuracy = useStore((s) => s.self.accuracy);
  const tool = useStore((s) => s.tool);
  const flyToId = useStore((s) => s.flyToId);

  // --- one-time init -----------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: L.Map;
    try {
      map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        zoomControl: false,
        attributionControl: true,
      });
    } catch (err) {
      setMapError((err as Error).message || "No se pudo inicializar el mapa.");
      return;
    }
    mapRef.current = map;

    L.tileLayer(TILE_URL, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: TILE_ATTR,
      detectRetina: true,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    gridLayerRef.current = L.layerGroup().addTo(map);
    trailsLayerRef.current = L.layerGroup().addTo(map);
    peersLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    measureLayerRef.current = L.layerGroup().addTo(map);
    navLayerRef.current = L.layerGroup().addTo(map);
    alertsLayerRef.current = L.layerGroup().addTo(map);
    draftLayerRef.current = L.layerGroup().addTo(map);

    map.on("dragstart", () => useStore.getState().setFollowSelf(false));
    map.on("click", onMapClick);
    map.on("mousemove", onMapMouseMove);
    map.on("moveend", pushGrid); // grid follows the viewport
    map.on("zoomend", pushGrid);

    pushSelf();
    pushGrid();
    pushTrails();
    pushPeers();
    pushMarkers();
    pushDraft();
    pushNav();
    pushAlerts();

    setTimeout(() => map.invalidateSize(), 300);
    setMapReady(true);
    const staleTimer = setInterval(pushPeers, 5000);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      clearInterval(staleTimer);
      ro.disconnect();
      map.remove();
      setMapReady(false);
      mapRef.current = null;
      selfMarkerRef.current = null;
      accuracyRef.current = null;
      peersLayerRef.current = null;
      trailsLayerRef.current = null;
      gridLayerRef.current = null;
      markersLayerRef.current = null;
      measureLayerRef.current = null;
      draftLayerRef.current = null;
      navLayerRef.current = null;
      alertsLayerRef.current = null;
      firstFixRef.current = false;
      coarseFixWarnedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- updaters ----------------------------------------------------------
  function pushSelf() {
    const map = mapRef.current;
    if (!map) return;
    const s = useStore.getState().self;
    if (s.lat == null || s.lng == null) return;
    const ll: [number, number] = [s.lat, s.lng];

    if (!selfMarkerRef.current) {
      const icon = L.divIcon({
        className: "irma-self-icon",
        html: `<div class="irma-self"><div class="irma-self-pulse"></div><div class="irma-self-arrow"></div></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      selfMarkerRef.current = L.marker(ll, { icon, interactive: false, zIndexOffset: 1000 }).addTo(map);
    } else {
      selfMarkerRef.current.setLatLng(ll);
    }
    const arrow = selfMarkerRef.current
      .getElement()
      ?.querySelector(".irma-self-arrow") as HTMLElement | null;
    if (arrow) arrow.style.transform = `translate(-50%, -60%) rotate(${s.heading ?? 0}deg)`;

    if (!accuracyRef.current) {
      accuracyRef.current = L.circle(ll, {
        radius: s.accuracy ?? 0,
        color: "#3ddc84",
        weight: 1,
        opacity: 0.4,
        fillColor: "#3ddc84",
        fillOpacity: 0.08,
      }).addTo(map);
    } else {
      accuracyRef.current.setLatLng(ll);
      accuracyRef.current.setRadius(s.accuracy ?? 0);
    }

    if (!firstFixRef.current) {
      // IP/wifi "GPS" on VMs/remote desktops returns ~10km accuracy and a
      // wrong location — don't yank the map to it. Only auto-center on a fix
      // precise enough to be a real GNSS lock; otherwise stay at DEFAULT_CENTER.
      if ((s.accuracy ?? Infinity) <= FIRST_FIX_MAX_ACCURACY_M) {
        firstFixRef.current = true;
        map.setView(ll, Math.max(map.getZoom(), 16));
      } else if (!coarseFixWarnedRef.current) {
        coarseFixWarnedRef.current = true;
        const acc = Math.round(s.accuracy ?? 0);
        useStore.setState((st) => ({
          log: [
            `${new Date().toLocaleTimeString([], { hour12: false })} GPS impreciso (±${acc} m) — mapa no recentrado. Fija posición con la herramienta.`,
            ...st.log,
          ].slice(0, 200),
        }));
      }
    } else if (useStore.getState().followSelf) {
      map.panTo(ll, { animate: true });
    }
  }

  function pushPeers() {
    const layer = peersLayerRef.current;
    if (!layer || !mapRef.current) return; // bail if the map was torn down (logout/unmount)
    layer.clearLayers();
    const t = Date.now();
    for (const p of Object.values(useStore.getState().peers)) {
      const stale = t - p.lastSeen > STALE_MS;
      const color = AFFILIATION_COLORS[p.affiliation];
      const rel = formatRelTime(p.lastSeen);
      const seen = rel === "ahora" ? "visto ahora" : `visto hace ${rel}`;
      // A non-OK status rings the dot in its alert color so it reads at a glance.
      const flagged = p.status && p.status !== "ok";
      if (flagged) {
        L.circleMarker([p.lat, p.lng], {
          radius: 10,
          color: STATUS_COLORS[p.status!],
          weight: 2,
          fillOpacity: 0,
          opacity: stale ? 0.4 : 0.95,
        }).addTo(layer);
      }
      const cm = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: "#0a0e0d",
        weight: 1.5,
        fillColor: color,
        fillOpacity: stale ? 0.35 : 1,
      });
      const tipStatus = flagged ? ` <span style="color:${STATUS_COLORS[p.status!]}">▲${STATUS_LABELS[p.status!]}</span>` : "";
      cm.bindTooltip(`<span style="color:${color}">${esc(p.callsign)}</span>${tipStatus}`, {
        permanent: true,
        direction: "top",
        offset: [0, -6],
        className: "irma-tip",
        opacity: stale ? 0.4 : 1,
      });
      cm.bindPopup(
        `<div class="irma-pop"><div class="irma-pop-h" style="color:${color}">${esc(p.callsign)}</div>` +
          `<div class="irma-pop-r">${AFFILIATION_LABELS[p.affiliation]}${flagged ? ` · <span style="color:${STATUS_COLORS[p.status!]}">${STATUS_LABELS[p.status!]}</span>` : ""}</div>` +
          `<div class="irma-pop-r irma-grid">${esc(formatGrid(p.lat, p.lng))}</div>` +
          `<div class="irma-pop-r">${seen}${p.battery != null ? ` · ${p.battery}%` : ""}</div></div>`,
      );
      cm.addTo(layer);
    }
  }

  function pushTrails() {
    const layer = trailsLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();
    const st = useStore.getState();
    if (!st.trailsOn) return;
    for (const [id, pts] of Object.entries(st.trails)) {
      if (pts.length < 2) continue;
      const isSelf = id === st.self.id;
      const color = isSelf
        ? AFFILIATION_COLORS.self
        : AFFILIATION_COLORS[st.peers[id]?.affiliation ?? "unknown"];
      L.polyline(pts.map((p) => [p.lat, p.lng]) as [number, number][], {
        color,
        weight: 2,
        opacity: 0.5,
        dashArray: "1 5",
        lineCap: "round",
      }).addTo(layer);
    }
  }

  // MGRS grid overlay. We step in UTM easting/northing (a true metric grid) and
  // invert each node back to lat/lng so lines curve correctly under the web-
  // mercator tiles. The whole viewport is forced into the centre's UTM zone — a
  // tiny shear at a zone seam, but correct for any local AO. Spacing shrinks with
  // zoom (100 km / 10 km / 1 km); labels show the MGRS principal digits.
  const GRID_COLOR = "#5eead4"; // teal — distinct from affiliation/marker colors
  const GEOFENCE_COLOR = "#ffb020"; // amber — geofence zones
  function pushGrid() {
    const layer = gridLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!useStore.getState().gridOn) return;

    const z = map.getZoom();
    if (z < 6) return; // too coarse for a metric grid — would span multiple zones
    const spacing = z >= 14 ? 1000 : z >= 11 ? 10000 : 100000;

    const b = map.getBounds().pad(0.1);
    const zone = utmZone(map.getCenter().lng);
    const north = map.getCenter().lat >= 0;
    const corners = [b.getNorthWest(), b.getNorthEast(), b.getSouthWest(), b.getSouthEast()].map(
      (c) => toUTM(c.lat, c.lng, zone),
    );
    const minE = Math.min(...corners.map((c) => c.e));
    const maxE = Math.max(...corners.map((c) => c.e));
    const minN = Math.min(...corners.map((c) => c.n));
    const maxN = Math.max(...corners.map((c) => c.n));
    // Guard against an absurd line count (e.g. a wrong zone at low zoom).
    if ((maxE - minE) / spacing > 80 || (maxN - minN) / spacing > 80) return;

    // Labels ride the *visible* edge (lines extend into the padded margin, so
    // anchoring a label at a line's padded end would push it off-screen). Inset
    // slightly so the text sits inside the viewport instead of on the very edge.
    const vc = (() => {
      const vb = map.getBounds();
      return [vb.getNorthWest(), vb.getNorthEast(), vb.getSouthWest(), vb.getSouthEast()].map((c) =>
        toUTM(c.lat, c.lng, zone),
      );
    })();
    const labelN = Math.max(...vc.map((c) => c.n)) - (maxN - minN) * 0.02; // near top
    const labelE = Math.min(...vc.map((c) => c.e)) + (maxE - minE) * 0.02; // near left

    const STEPS = 8; // polyline samples per line, so it curves smoothly
    const lineStyle: L.PolylineOptions = {
      color: GRID_COLOR,
      weight: 0.5,
      opacity: 0.4,
      interactive: false,
    };
    // The MGRS principal digits for a grid value within its 100 km square.
    const label = (v: number) =>
      String(Math.floor((((v % 100000) + 100000) % 100000) / spacing)).padStart(
        spacing === 1000 ? 2 : 1,
        "0",
      );
    const tick = (text: string, lat: number, lng: number) =>
      L.marker([lat, lng], {
        interactive: false,
        icon: L.divIcon({ className: "irma-grid-label", html: esc(text), iconSize: [0, 0] }),
      }).addTo(layer);

    for (let e = Math.ceil(minE / spacing) * spacing; e <= maxE; e += spacing) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= STEPS; i++) {
        const p = fromUTM({ zone, north, e, n: minN + ((maxN - minN) * i) / STEPS });
        pts.push([p.lat, p.lng]);
      }
      L.polyline(pts, lineStyle).addTo(layer);
      if (spacing < 100000) {
        const lp = fromUTM({ zone, north, e, n: labelN }); // top of visible area
        tick(label(e), lp.lat, lp.lng);
      }
    }
    for (let n = Math.ceil(minN / spacing) * spacing; n <= maxN; n += spacing) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= STEPS; i++) {
        const p = fromUTM({ zone, north, e: minE + ((maxE - minE) * i) / STEPS, n });
        pts.push([p.lat, p.lng]);
      }
      L.polyline(pts, lineStyle).addTo(layer);
      if (spacing < 100000) {
        const lp = fromUTM({ zone, north, e: labelE, n }); // left of visible area
        tick(label(n), lp.lat, lp.lng);
      }
    }
  }

  function pushMarkers() {
    const layer = markersLayerRef.current;
    if (!layer || !mapRef.current) return; // bail if the map was torn down (logout/unmount)
    layer.clearLayers();
    const fenceFlash = useStore.getState().fenceFlash;
    for (const m of Object.values(useStore.getState().markers)) {
      // A geofence reads in amber and pulses briefly when a unit breaches it.
      const fence = !!m.geofence && (m.type === "circle" || m.type === "polygon");
      const color = fence ? GEOFENCE_COLOR : m.color ?? AFFILIATION_COLORS[m.affiliation];
      const fenceClass = fence && Date.now() - (fenceFlash[m.id] ?? 0) < 5000 ? "irma-alert-pulse" : undefined;
      const popup =
        `<div class="irma-pop"><div class="irma-pop-h" style="color:${color}">${esc(m.label ?? "Marcador")}${fence ? " ⬡" : ""}</div>` +
        `<div class="irma-pop-r">${fence ? "GEOCERCA · " : ""}${AFFILIATION_LABELS[m.affiliation]} · por ${esc(m.createdBy)}</div>` +
        (m.remark ? `<div class="irma-pop-r">${esc(m.remark)}</div>` : "") +
        `<div class="irma-pop-r irma-grid">${esc(formatGrid(m.coords[0].lat, m.coords[0].lng))}</div></div>`;
      if (m.type === "point") {
        const cm = L.circleMarker([m.coords[0].lat, m.coords[0].lng], {
          radius: 7,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.25,
        });
        if (m.label) {
          cm.bindTooltip(`<span style="color:${color}">${esc(m.label)}</span>`, {
            permanent: true,
            direction: "top",
            offset: [0, -6],
            className: "irma-tip",
          });
        }
        cm.bindPopup(popup);
        cm.addTo(layer);
      } else if (m.type === "circle") {
        const circle = L.circle([m.coords[0].lat, m.coords[0].lng], {
          radius: m.radius ?? 0,
          color,
          weight: fence ? 2.5 : 2,
          fillColor: color,
          fillOpacity: fence ? 0.06 : 0.1,
          dashArray: "4 3",
          className: fenceClass,
        });
        if (fence && m.label) {
          circle.bindTooltip(`<span style="color:${color}">⬡ ${esc(m.label)}</span>`, {
            permanent: true, direction: "center", className: "irma-tip",
          });
        }
        circle.bindPopup(popup);
        circle.addTo(layer);
      } else {
        const latlngs = m.coords.map((c) => [c.lat, c.lng]) as [number, number][];
        const shape =
          m.type === "polygon"
            ? L.polygon(latlngs, {
                color, weight: fence ? 2.5 : 2, fillColor: color,
                fillOpacity: fence ? 0.08 : 0.15, dashArray: "4 3", className: fenceClass,
              })
            : L.polyline(latlngs, { color, weight: 2, dashArray: "4 3" });
        if (fence && m.label && m.type === "polygon") {
          shape.bindTooltip(`<span style="color:${color}">⬡ ${esc(m.label)}</span>`, {
            permanent: true, direction: "center", className: "irma-tip",
          });
        }
        shape.bindPopup(popup);
        shape.addTo(layer);
      }
    }
  }

  // --- interaction -------------------------------------------------------
  function onMapClick(e: L.LeafletMouseEvent) {
    const st = useStore.getState();
    const at: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (st.tool === "set-self") {
      st.setSelfPositionManual(at.lat, at.lng);
      st.setTool("pan");
      return;
    }
    if (st.tool.startsWith("marker-")) {
      const aff = affiliationOf(st.tool);
      const label =
        st.tool === "marker-point"
          ? `PR-${Object.keys(st.markers).length + 1}`
          : AFFILIATION_LABELS[aff];
      st.placeMarker({
        type: "point",
        affiliation: aff,
        coords: [at],
        label,
        color: st.tool === "marker-point" ? "#3ddc84" : undefined,
      });
      return;
    }
    if (st.tool === "draw-line" || st.tool === "draw-polygon" || st.tool === "draw-circle") {
      // Circle is fully defined by 2 clicks (center, edge) — commit on the second.
      if (st.tool === "draw-circle" && st.draft.length >= 1) {
        st.addDraftPoint(at);
        st.commitDraft();
      } else {
        st.addDraftPoint(at);
      }
      return;
    }
    if (st.tool === "measure") handleMeasure(at);
  }

  // Live preview: rubber-band the draft to the cursor while drawing.
  function onMapMouseMove(e: L.LeafletMouseEvent) {
    const st = useStore.getState();
    if (!st.tool.startsWith("draw-") || st.draft.length === 0) return;
    pushDraft({ lat: e.latlng.lat, lng: e.latlng.lng });
  }

  // --- draft / nav / alert renderers -------------------------------------
  const DRAW_COLOR = "#7dd3fc";

  function pushDraft(cursor?: LatLng) {
    const layer = draftLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();
    const st = useStore.getState();
    const pts = st.draft;
    if (!st.tool.startsWith("draw-") || pts.length === 0) return;

    for (const p of pts) {
      L.circleMarker([p.lat, p.lng], {
        radius: 4, color: DRAW_COLOR, weight: 1.5, fillColor: DRAW_COLOR, fillOpacity: 1,
      }).addTo(layer);
    }

    if (st.tool === "draw-circle") {
      const edge = cursor ?? pts[1];
      if (edge) {
        const radius = haversine(pts[0], edge);
        L.circle([pts[0].lat, pts[0].lng], {
          radius, color: DRAW_COLOR, weight: 2, fillColor: DRAW_COLOR, fillOpacity: 0.08, dashArray: "4 3",
        }).addTo(layer);
        L.popup({ closeButton: false, className: "irma-measure-popup" })
          .setLatLng([edge.lat, edge.lng])
          .setContent(`<div class="irma-measure">R ${formatDistance(radius)}</div>`)
          .addTo(layer);
      }
      return;
    }

    const line = cursor ? [...pts, cursor] : pts;
    const latlngs = line.map((p) => [p.lat, p.lng]) as [number, number][];
    if (st.tool === "draw-polygon") {
      L.polygon(latlngs, {
        color: DRAW_COLOR, weight: 2, fillColor: DRAW_COLOR, fillOpacity: 0.1, dashArray: "4 3",
      }).addTo(layer);
    } else {
      L.polyline(latlngs, { color: DRAW_COLOR, weight: 2, dashArray: "4 3" }).addTo(layer);
    }
  }

  function pushNav() {
    const layer = navLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const st = useStore.getState();
    const id = st.navTargetId;
    if (!id || st.self.lat == null || st.self.lng == null) return;
    const from: LatLng = { lat: st.self.lat, lng: st.self.lng };
    let to: LatLng | null = null;
    if (st.peers[id]) to = { lat: st.peers[id].lat, lng: st.peers[id].lng };
    else if (st.markers[id]) to = st.markers[id].coords[0];
    if (!to) return;
    L.polyline(
      [[from.lat, from.lng], [to.lat, to.lng]] as [number, number][],
      { color: "#f0abfc", weight: 2.5, opacity: 0.9, dashArray: "8 5" },
    ).addTo(layer);
  }

  function pushAlerts() {
    const layer = alertsLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();
    for (const a of Object.values(useStore.getState().alerts)) {
      const ring = L.circleMarker([a.lat, a.lng], {
        radius: 14, color: "#ff4d4d", weight: 2, fillColor: "#ff4d4d", fillOpacity: 0.25,
        className: "irma-alert-pulse",
      });
      ring.bindTooltip(`⚠ ${a.from}`, {
        permanent: true, direction: "top", offset: [0, -10], className: "irma-tip", opacity: 1,
      });
      ring.addTo(layer);
    }
  }

  function handleMeasure(at: LatLng) {
    const layer = measureLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    const pts = measureRef.current;
    if (pts.length >= 2) pts.length = 0;
    pts.push(at);
    layer.clearLayers();
    for (const p of pts) {
      L.circleMarker([p.lat, p.lng], {
        radius: 4,
        color: "#ffb020",
        weight: 1.5,
        fillColor: "#ffb020",
        fillOpacity: 1,
      }).addTo(layer);
    }
    if (pts.length === 2) {
      L.polyline(pts.map((p) => [p.lat, p.lng]) as [number, number][], {
        color: "#ffb020",
        weight: 2,
        dashArray: "4 3",
      }).addTo(layer);
      const dist = haversine(pts[0], pts[1]);
      const mid: [number, number] = [
        (pts[0].lat + pts[1].lat) / 2,
        (pts[0].lng + pts[1].lng) / 2,
      ];
      L.popup({ closeButton: false, className: "irma-measure-popup" })
        .setLatLng(mid)
        .setContent(`<div class="irma-measure">${formatDistance(dist)}</div>`)
        .openOn(map);
    }
  }

  // --- reactive effects --------------------------------------------------
  useEffect(() => {
    pushSelf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfLat, selfLng, selfHeading, selfAccuracy]);

  useEffect(() => {
    pushPeers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peers]);

  useEffect(() => {
    pushTrails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trails, trailsOn]);

  useEffect(() => {
    pushGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridOn]);

  useEffect(() => {
    pushMarkers();
    // nav line endpoint may live on a marker; keep it in sync
    pushNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, fenceFlash]);

  useEffect(() => {
    pushDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, tool]);

  useEffect(() => {
    pushAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  useEffect(() => {
    pushNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTargetId, selfLat, selfLng, peers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = tool === "pan" ? "" : "crosshair";
    if (tool !== "measure") {
      measureRef.current = [];
      measureLayerRef.current?.clearLayers();
      map.closePopup();
    }
  }, [tool]);

  useEffect(() => {
    if (!flyToId) return;
    const map = mapRef.current;
    if (!map) return;
    const id = flyToId.split(":")[0];
    const st = useStore.getState();
    let target: [number, number] | null = null;
    if (id === st.self.id && st.self.lat != null && st.self.lng != null) {
      target = [st.self.lat, st.self.lng];
    } else if (st.peers[id]) {
      target = [st.peers[id].lat, st.peers[id].lng];
    } else if (st.markers[id]) {
      target = [st.markers[id].coords[0].lat, st.markers[id].coords[0].lng];
    }
    if (target) map.flyTo(target, Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToId]);

  return (
    <>
      {/* z-0 creates a stacking context so Leaflet's internal z-indexes (panes
          400, controls 1000) stay trapped below the z-20 UI panels. */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {mapReady && mapRef.current && <PeerVideoOverlay map={mapRef.current} />}
      {mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-tac-bg p-6 text-center">
          <div className="max-w-sm">
            <div className="mb-2 font-mono text-sm font-bold text-tac-danger">ERROR DE MAPA</div>
            <p className="text-xs text-tac-muted">{mapError}</p>
          </div>
        </div>
      )}
    </>
  );
}
