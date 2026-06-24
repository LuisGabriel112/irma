# IRMA — Conciencia Situacional Táctica (PWA)

Plataforma de conciencia situacional de equipo **tipo ATAK**, reconstruida como **app web instalable (PWA)** con transporte de **malla LoRa** de primera clase. Seguimiento de unidades en vivo, gráficos tácticos y chat — sobre celular, Wi‑Fi o radio LoRa fuera de red — con una interfaz táctica deliberadamente despejada.

> Conciencia situacional civil para SAR, seguridad de eventos, expediciones y equipos de campo. Objetivo de referencia: ATAK-CIV, menos el desorden.

---

## Características

- **Mapa en vivo** (Leaflet, tiles raster oscuros CARTO) con flecha de posición propia + anillo de precisión GPS. Funciona en cualquier entorno, incluso VMs/escritorios remotos sin WebGL.
- **Seguimiento de equipo** — pares renderizados por afiliación (aliado / hostil / neutral / desconocido), con rango, rumbo, último visto y batería.
- **Gráficos tácticos** — coloca marcadores (aliado/hostil/neutral) y puntos de ruta; dibuja **líneas, polígonos y círculos**; herramienta de medición rango/rumbo. Los gráficos se difunden a toda la red.
- **Alertas de emergencia** — botón de **pánico** de un toque que transmite tu posición y parpadea en el mapa de todo el equipo, con aviso sonoro.
- **Navegación a objetivo** — selecciona una unidad o marcador y obtén distancia + rumbo en vivo (bloodhound), con la flecha de posición propia orientada por la **brújula real del dispositivo**.
- **Chat de red** — mensajería de difusión por la malla.
- **Transporte conectable** — una app, varios enlaces:
  - **Malla simulada** (sin hardware — roster demo)
  - **Relay WebSocket** (amigos por internet, salas compartidas)
  - **LoRa por USB serial** (Web Serial)
  - **LoRa por Bluetooth LE** (Web Bluetooth, Nordic UART Service)
- **Interop CoT** — mapeo XML Cursor-on-Target para puentear con ATAK / WinTAK / TAK Server.
- **PWA offline-first** — instalable, con caché de app-shell + tiles de mapa para uso sin conectividad.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · **Leaflet** · Zustand. Tiles base por [CARTO](https://carto.com/attributions) (sin API key).

---

## Inicio rápido

```bash
npm install
npm run dev          # http://localhost:3000
```

Permite el acceso a la ubicación para ver tu posición; si no, el mapa abre en un centro por defecto (Veracruz). Conecta un transporte desde el panel **Enlace** para ver tráfico.

```bash
npm run build && npm start   # producción (service worker / offline activo)
```

### Acceso desde el celular (GPS real)

`navigator.geolocation` requiere **contexto seguro** (HTTPS o localhost). Para usar el GPS real de un teléfono en tu red local:

```bash
npm run dev:lan      # next dev --experimental-https -H 0.0.0.0
```

Abre `https://<ip-LAN-de-tu-PC>:3000` en el teléfono (misma Wi‑Fi), acepta el certificado autofirmado y permite la ubicación. Web Serial / Web Bluetooth requieren un navegador Chromium (Chrome/Edge, escritorio o Android) sobre **HTTPS o localhost**.

---

## Uso

| Herramienta | Acción |
| --- | --- |
| Mano | Mover / seleccionar (clic en unidades y gráficos para detalle) |
| Marcadores ▾ | Colocar marcador aliado / hostil / neutral / punto de ruta |
| Dibujar ▾ | Trazar línea / polígono / círculo |
| Regla | Rango + rumbo entre dos clics |
| Fijar posición | Toca el mapa para fijar tu ubicación a mano |
| Centrar | Recentrar y seguir tu posición |
| Sirena | Emitir alerta de pánico a la sala |

Pestañas del panel derecho: **Unidades** (roster, clic para volar; botón de navegar por unidad), **Chat**, **Gráficos** (lista/borrar), **Enlace** (callsign/equipo, elegir + conectar transporte, registro del enlace).

---

## Multi-dispositivo por internet (relay)

El transporte **WebSocket** difunde paquetes entre todos los clientes de una misma **sala**. Levanta el relay incluido o despliégalo en la nube:

```bash
npm run relay        # escucha en :1234 (o $PORT)
```

El relay es un fan-out por sala agnóstico al formato (`relay/server.mjs`). Para producción, despliégalo en cualquier host con proceso de larga vida + WebSocket (Render, Railway, Fly) y apunta la app con `NEXT_PUBLIC_RELAY_URL=wss://tu-relay`. Incluye `render.yaml` (Blueprint) y `relay/Dockerfile`.

Comparte la **URL** + el **código de sala** con tu equipo: todos en la misma sala se ven en el mapa, desde cualquier red.

---

## Puente de radio LoRa

El navegador no puede manejar una radio LoRa directamente. IRMA habla con un pequeño **puente de radio** — cualquier placa LoRa (Heltec/TTGO/LilyGO, RAK, o un nodo tipo Meshtastic) que retransmita **tramas delimitadas por salto de línea** entre su puerto USB/BLE y el PHY LoRa.

### Protocolo de cable

Un paquete por línea: JSON compacto, dimensionado para caber en una sola trama LoRa (≤ **222 bytes**, SF7–SF9). Claves cortas para abaratar el aire; `t` es el código de tipo.

```
{"t":0,"i":"a1b2","c":"RAVEN-1","a":"s","la":19.4326,"ln":-99.1332,"h":270,"b":88,"ts":1718480000000}
```

| `t` | tipo | campos clave |
| --- | --- | --- |
| 0 | posición | `i` id, `c` callsign, `a` afiliación, `la`/`ln` lat/lng, `h` rumbo, `s` velocidad, `ac` precisión, `b` batería |
| 1 | mensaje | `i` id, `f` de, `o` a (omitir = difusión), `x` texto |
| 2 | marcador | `i` id, `m` tipo, `a` afiliación, `co` coords, `rd` radio (círculo), `l` etiqueta, `r` nota, `by` autor |
| 3 | borrar-marcador | `i` id |
| 4 | ping | `i` id, `f` de, `la`/`ln` |
| 5 | alerta | `i` id, `f` de, `k` tipo (pánico/médico/contacto), `la`/`ln` |

Códigos de afiliación: `s` propio · `f` aliado · `n` neutral · `h` hostil · `u` desconocido. Implementación: [`src/lib/protocol/packet.ts`](src/lib/protocol/packet.ts).

### Firmware de referencia (Arduino, serial ⇄ LoRa)

Puente mínimo con la librería [`LoRa`](https://github.com/sandeepmistry/arduino-LoRa) en una placa SX127x. Reenvía cada línea del serial USB a la radio e imprime cada trama recibida como línea — justo lo que espera el transporte Web Serial.

```cpp
#include <SPI.h>
#include <LoRa.h>

void setup() {
  Serial.begin(115200);
  LoRa.setPins(/*SS*/18, /*RST*/14, /*DIO0*/26);   // ajusta a tu placa
  if (!LoRa.begin(915E6)) { Serial.println("{\"t\":4,\"i\":\"radio-fail\"}"); while (1); }
  LoRa.setSpreadingFactor(9);
}

void loop() {
  // USB -> LoRa: retransmite una trama terminada en salto de línea
  static String tx;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') { LoRa.beginPacket(); LoRa.print(tx); LoRa.endPacket(); tx = ""; }
    else if (c != '\r') tx += c;
  }
  // LoRa -> USB: emite una trama recibida como línea
  int sz = LoRa.parsePacket();
  if (sz) { String rx; while (LoRa.available()) rx += (char)LoRa.read(); Serial.println(rx); }
}
```

**Puente Bluetooth:** expón el mismo flujo de líneas sobre el **Nordic UART Service** (`6e400001-…`); el transporte BLE de IRMA escribe en la característica RX y se suscribe a TX. Los dispositivos Meshtastic ya hablan BLE — envuelve su canal de mensajes de texto con el mismo marco para puentear el tráfico de IRMA a una malla Meshtastic existente.

---

## Arquitectura

```
src/
  lib/
    protocol/   packet.ts (códec compacto, guarda de MTU LoRa) · cot.ts (interop CoT XML)
    transport/  interfaz Transport + framing base
                ├─ simulated.ts  (malla demo en la app)
                ├─ websocket.ts  (relay por internet, salas)
                ├─ serial.ts     (Web Serial)
                ├─ bluetooth.ts  (Web Bluetooth / NUS)
                └─ manager.ts    (ciclo de vida del enlace activo)
    store/      useStore.ts (Zustand: propio, pares, marcadores, mensajes, alertas, enlace)
    geo/        haversine, rumbo, formateo, proyección
  components/
    map/MapView.tsx   (capas Leaflet, interacción, dibujo, popups)
    MapHud.tsx        (controles de dibujo, HUD de navegación, banner de alertas)
    StatusBar · ToolDock · SidePanel · panels/{Units,Chat,Markers,Link}
    AppShell.tsx      (watch GPS, brújula, beacon de posición, registro SW)
```

La abstracción **Transport** es la decisión de diseño clave: la app envía/recibe `Packet`s sobre *cualquier* enlace. Cambiar LoRa por un relay WebSocket o un enlace Meshtastic protobuf directo es una sola implementación nueva de `Transport` — sin cambios de UI ni estado.

## Offline / PWA

Instalable (manifest + iconos). El service worker ([`public/sw.js`](public/sw.js), solo producción) cachea el app-shell con estrategia network-first y los tiles/glyphs con cache-first, así un área ya vista queda disponible fuera de red.

## Hoja de ruta

- Transporte Meshtastic protobuf nativo (directo, sin firmware custom)
- Cifrado E2E de paquetes (claves por equipo)
- Cuadrícula MGRS y entrada de coordenadas
- Paquetes de tiles offline (importación MBTiles)
- Rastros (breadcrumbs) e historial de unidades
- Geofencing y alertas de zona

---

*Proyecto educativo / civil de conciencia situacional. No afiliado al TAK Product Center ni al Gobierno de EE. UU.*
