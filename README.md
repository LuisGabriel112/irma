# IRMA — Tactical Situational Awareness (PWA)

An **ATAK-class** team-awareness platform, rebuilt as a clean, installable **web app (PWA)** with a first-class **LoRa mesh** transport. Live unit tracking, tactical graphics, and chat — over cellular, Wi‑Fi, or off-grid LoRa radio — with a deliberately uncluttered tactical UI.

> Civilian situational awareness for SAR, event safety, expeditions, and field teams. Benchmark target: ATAK-CIV, minus the clutter.

---

## Features

- **Live map** (MapLibre GL, dark vector basemap) with own-position arrow + GPS accuracy ring.
- **Team tracking** — peers rendered by affiliation (friend / hostile / neutral / unknown), with range, bearing, last-seen and battery.
- **Tactical graphics** — drop friendly/hostile/neutral markers and waypoints; range-measure tool. Graphics broadcast to the whole net.
- **Net chat** — broadcast messaging across the mesh.
- **Pluggable transport** — one app, three links:
  - **Simulated mesh** (no hardware — demo roster, on by default)
  - **LoRa over USB serial** (Web Serial)
  - **LoRa over Bluetooth LE** (Web Bluetooth, Nordic UART Service)
- **CoT interop** — Cursor-on-Target XML mapping for bridging to ATAK / WinTAK / TAK Server.
- **Offline-first PWA** — installable, with app-shell + map-tile caching for use without connectivity.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · MapLibre GL · Zustand. Basemap tiles by [OpenFreeMap](https://openfreemap.org) (no API key).

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The simulated mesh auto-connects so the map is alive immediately. Allow location access to see your own position; otherwise the map opens at a default center.

```bash
npm run build && npm start   # production (service worker / offline active)
```

> **Browser support for LoRa:** Web Serial and Web Bluetooth require a Chromium browser (Chrome/Edge, desktop or Android) served over **HTTPS or localhost**. The app, map, and simulated mesh work in any modern browser.

---

## Using it

| Tool (left dock) | Action |
| --- | --- |
| Hand | Pan / select (click units & graphics for details) |
| Shield / Skull / Square | Place friendly / hostile / neutral graphic at click |
| Pin | Drop a numbered waypoint |
| Ruler | Range + bearing between two clicks |
| Locate | Recenter & follow own position |

Right panel tabs: **Units** (roster, click to fly-to), **Chat**, **Graphics** (list/delete), **Link** (set callsign/team, choose + connect a transport, view link log).

---

## LoRa hardware bridge

The browser cannot drive a LoRa radio directly. IRMA talks to a small **radio bridge** — any LoRa dev board (Heltec/TTGO/LilyGO, RAK, or a Meshtastic-class node) that relays **newline-delimited frames** between its USB/BLE serial port and the LoRa PHY.

### Wire protocol

One packet per line: compact JSON, sized to fit a single LoRa frame (≤ **222 bytes**, SF7–SF9). Short keys keep it on-air-cheap; `t` is the type code.

```
{"t":0,"i":"a1b2","c":"RAVEN-1","a":"s","la":19.4326,"ln":-99.1332,"h":270,"b":88,"ts":1718480000000}
```

| `t` | kind | key fields |
| --- | --- | --- |
| 0 | position | `i` id, `c` callsign, `a` affiliation, `la`/`ln` lat/lng, `h` heading, `s` speed, `ac` accuracy, `b` battery |
| 1 | message | `i` id, `f` from, `o` to (omit = broadcast), `x` text |
| 2 | marker | `i` id, `m` type, `a` aff, `co` coords, `l` label, `r` remark, `by` author |
| 3 | marker-delete | `i` id |
| 4 | ping | `i` id, `f` from, `la`/`ln` |

Affiliation codes: `s` self · `f` friend · `n` neutral · `h` hostile · `u` unknown. Implementation: [`src/lib/protocol/packet.ts`](src/lib/protocol/packet.ts).

### Reference firmware (Arduino, serial ⇄ LoRa)

Minimal bridge using the [`LoRa`](https://github.com/sandeepmistry/arduino-LoRa) library on an SX127x board. It forwards each USB-serial line to the radio and prints each received frame back as a line — exactly what the Web Serial transport expects.

```cpp
#include <SPI.h>
#include <LoRa.h>

void setup() {
  Serial.begin(115200);
  LoRa.setPins(/*SS*/18, /*RST*/14, /*DIO0*/26);   // adjust to your board
  if (!LoRa.begin(915E6)) { Serial.println("{\"t\":4,\"i\":\"radio-fail\"}"); while (1); }
  LoRa.setSpreadingFactor(9);
}

void loop() {
  // USB -> LoRa: relay one newline-terminated frame
  static String tx;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') { LoRa.beginPacket(); LoRa.print(tx); LoRa.endPacket(); tx = ""; }
    else if (c != '\r') tx += c;
  }
  // LoRa -> USB: emit a received frame as a line
  int sz = LoRa.parsePacket();
  if (sz) { String rx; while (LoRa.available()) rx += (char)LoRa.read(); Serial.println(rx); }
}
```

**Bluetooth bridge:** expose the same line stream over the **Nordic UART Service** (`6e400001-…`); IRMA's BLE transport writes to the RX characteristic and subscribes to TX. Meshtastic devices already speak BLE — wrap their text-message channel with the same framing to bridge IRMA traffic onto an existing Meshtastic mesh.

---

## Architecture

```
src/
  lib/
    protocol/   packet.ts (compact codec, LoRa MTU guard) · cot.ts (CoT XML interop)
    transport/  Transport interface + base framing
                ├─ simulated.ts  (in-app demo mesh)
                ├─ serial.ts     (Web Serial)
                ├─ bluetooth.ts  (Web Bluetooth / NUS)
                └─ manager.ts    (active-link lifecycle)
    store/      useStore.ts (Zustand: self, peers, markers, messages, link)
    geo/        haversine, bearing, formatting, projection
  components/
    map/MapView.tsx   (MapLibre layers, interaction, popups)
    StatusBar · ToolDock · SidePanel · panels/{Units,Chat,Markers,Link}
    AppShell.tsx      (GPS watch, position beacon, SW registration)
```

The **Transport** abstraction is the key design choice: the app sends/receives `Packet`s over *any* link. Swapping LoRa for a future WebSocket relay or direct Meshtastic protobuf link is a single new `Transport` implementation — no UI or state changes.

## Offline / PWA

Installable (manifest + icons). The service worker ([`public/sw.js`](public/sw.js), production only) network-first caches the app shell and cache-first caches map tiles/glyphs, so a previously viewed area stays available off-grid.

## Roadmap

- Native Meshtastic protobuf transport (direct, no custom firmware)
- Polyline / polygon / circle drawing + freehand
- MGRS grid & coordinate entry
- Persistent offline tile packs (MBTiles import)
- WebSocket relay transport for online teams + TAK Server bridge
- E2E packet encryption (per-team keys)

---

*Educational / civilian situational-awareness project. Not affiliated with TAK Product Center or the U.S. Government.*
