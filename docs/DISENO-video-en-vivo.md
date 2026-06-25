# IRMA — Video en vivo sobre el marcador (diseño WebRTC)

> Objetivo: thumbnail de video en vivo de cada dispositivo flotando sobre su marcador en
> el mapa, encendible por unidad. Comparte 90% de la infraestructura con las llamadas de
> voz WebRTC pendientes — se construyen juntas.

## 1. Principio rector

El video **no** es un `Packet`. Es media P2P por `RTCPeerConnection`. Lo único que viaja
por la red IRMA es la **señalización** (SDP/ICE), como un nuevo tipo de paquete que
reutiliza el transporte existente (relay WebSocket).

| Camino | Transporte | Tamaño |
|---|---|---|
| Señalización (offer/answer/ICE) | Relay WebSocket actual (`SignalPacket` t=7) | KB — cabe en 1 MB, **nunca por LoRa** |
| Media (video + audio) | WebRTC P2P (SRTP), o TURN si NAT estricto | adaptativo, fuera de la app |

Encaja con la abstracción `Transport`: cero cambios en serial/BLE/simulado. Solo el relay
mueve señalización (los enlaces LoRa simplemente descartan `signal` por presupuesto de trama).

## 2. Topología

Malla completa: cada par abre una conexión con cada otro par.

- Equipo de **N** nodos → **N·(N−1)/2** conexiones, cada uno sube su video a **N−1** pares.
- Práctico hasta ~6-8 nodos. Más allá la subida de cada cámara se multiplica → mover a un
  **SFU** (cada nodo sube 1 vez, el servidor reparte). Fuera de alcance de v1.
- **Starlink**: terminal compartido = subida única (~10-20 Mbps) repartida entre todos los
  videos salientes. 3-4 cámaras vivas es el techo realista.

## 3. Cambios en el protocolo

`src/lib/protocol/packet.ts` — nuevo tipo, relay-only (como `media`):

```ts
export interface SignalPacket {
  kind: "signal";
  id: string;          // signal id
  from: string;        // sender peer id (self.id, no callsign — enrutamiento estable)
  to: string;          // destinatario peer id (señalización siempre dirigida)
  signal: RTCSessionDescriptionInit | { candidate: RTCIceCandidateInit }; // SDP u ICE
  ts: number;
}
```

Códec (claves cortas): `t:7, i, f(from), o(to), g(payload JSON), ts`. El payload `g` es el
SDP/ICE serializado — varios KB, prohibido en LoRa pero trivial por relay.

```ts
const TYPE = { position:0, message:1, marker:2, "marker-delete":3, ping:4, alert:5, media:6, signal:7 };
// toWire: { t:7, i:p.id, f:p.from, o:p.to, g:JSON.stringify(p.signal), ts:p.ts }
// fromWire: signal: JSON.parse(String(w.g))
```

`fitsInFrame()` ya excluye media; agregar `signal` a la lista relay-only.

## 4. Módulo de malla WebRTC — `src/lib/webrtc/mesh.ts` (nuevo)

Posee un `RTCPeerConnection` por par. Recibe señalización entrante y emite saliente vía un
callback (que el store cablea a `manager.send`). Patrón **perfect negotiation** para evitar
glare: el par con `id` menor es "educado".

```ts
import { useStore } from "@/lib/store/useStore";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  // TURN obligatorio con Starlink/CGNAT. Configurar por env en runtime:
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USER,
        credential: process.env.NEXT_PUBLIC_TURN_PASS,
      }]
    : []),
];

interface SignalOut {
  (to: string, signal: unknown): void; // store → manager.send(encode signal)
}

interface PeerConn {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  polite: boolean;
}

export class WebRTCMesh {
  private conns = new Map<string, PeerConn>();
  private localStream?: MediaStream;
  private selfId: string;
  private signalOut: SignalOut;
  private onRemote: (peerId: string, stream: MediaStream | null) => void;

  constructor(selfId: string, signalOut: SignalOut,
              onRemote: (peerId: string, stream: MediaStream | null) => void) {
    this.selfId = selfId;
    this.signalOut = signalOut;
    this.onRemote = onRemote;
  }

  /** Encender cámara local y empezar a ofrecer a los pares deseados. */
  async startBroadcast(targets: string[]): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, frameRate: 15 }, // bajo bitrate: pensado para campo
      audio: false, // audio = llamadas de voz, módulo aparte
    });
    for (const id of targets) this.ensureConn(id, true);
  }

  stopBroadcast(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    for (const [id] of this.conns) this.close(id);
  }

  private ensureConn(peerId: string, initiator: boolean): PeerConn {
    let entry = this.conns.get(peerId);
    if (entry) return entry;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    entry = { pc, makingOffer: false, polite: this.selfId < peerId };
    this.conns.set(peerId, entry);

    // Subir nuestras pistas locales (si transmitimos)
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));

    pc.ontrack = (e) => this.onRemote(peerId, e.streams[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signalOut(peerId, { candidate: e.candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      try {
        entry!.makingOffer = true;
        await pc.setLocalDescription();
        this.signalOut(peerId, pc.localDescription!);
      } finally {
        entry!.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        this.onRemote(peerId, null);
      }
    };
    return entry;
  }

  /** Señalización entrante (desde ingestLine → store → aquí). */
  async onSignal(from: string, signal: any): Promise<void> {
    const entry = this.ensureConn(from, false);
    const pc = entry.pc;
    try {
      if (signal.candidate) {
        await pc.addIceCandidate(signal.candidate).catch(() => {}); // glare benigno
        return;
      }
      // SDP: perfect negotiation
      const offerCollision =
        signal.type === "offer" &&
        (entry.makingOffer || pc.signalingState !== "stable");
      if (offerCollision && !entry.polite) return; // impolite ignora colisión
      await pc.setRemoteDescription(signal);
      if (signal.type === "offer") {
        await pc.setLocalDescription();
        this.signalOut(from, pc.localDescription!);
      }
    } catch (e) {
      console.warn("signal error", e);
    }
  }

  private close(peerId: string): void {
    this.conns.get(peerId)?.pc.close();
    this.conns.delete(peerId);
    this.onRemote(peerId, null);
  }

  destroy(): void {
    this.stopBroadcast();
  }
}
```

## 5. Cambios en el store — `src/lib/store/useStore.ts`

```ts
// estado nuevo
videoBroadcasting: boolean;              // ¿transmito mi cámara?
remoteStreams: Record<string, MediaStream>; // peerId → stream entrante (no se persiste)
watching: Set<string>;                   // peerIds cuyo video quiero ver

// acciones
startVideo(): Promise<void>;   // mesh.startBroadcast(peerIds visibles)
stopVideo(): void;
watchPeer(peerId: string): void;   // pide ver el video de un par
unwatchPeer(peerId: string): void;
```

Instanciar la malla junto al `TransportManager` (ya existe el patrón):

```ts
const mesh = new WebRTCMesh(
  get().self.id,
  (to, signal) => {
    const s = get();
    void manager.send(encode({
      kind: "signal", id: `${s.self.id}-${now()}`, from: s.self.id, to, signal, ts: now(),
    }));
  },
  (peerId, stream) =>
    set((s) => {
      const next = { ...s.remoteStreams };
      if (stream) next[peerId] = stream; else delete next[peerId];
      return { remoteStreams: next };
    }),
);
```

En `applyPacket`, caso nuevo:

```ts
case "signal": {
  if (p.to !== state.self.id) return; // no es para mí
  void mesh.onSignal(p.from, p.signal);
  break;
}
```

Notas:
- `remoteStreams` y `videoBroadcasting` **no** se persisten (efímeros, igual que GPS vivo).
- Solo cablear la malla cuando `connection.kind === "websocket"` (LoRa no transporta señalización).
- En `disconnect()`/`logout()` llamar `mesh.destroy()`.

## 6. UI — video sobre el marcador (`src/components/map/MapView.tsx`)

Leaflet ya usa `L.divIcon` con HTML para el ícono propio. Mismo mecanismo para colgar un
`<video>` sobre el par. Dos opciones:

**A. `L.divIcon` con `<video>` embebido** (simple, pero el div se recrea en cada `pushPeers`).
**B. Overlay React posicionado** (recomendado): un componente `<PeerVideoLayer>` que mapea
`map.latLngToContainerPoint()` y posiciona `<video>` absolutos sobre el contenedor — sobrevive
a los re-render de marcadores y reusa el `MediaStream` sin recrear el elemento (clave: recrear
un `<video>` corta el stream).

```tsx
// PeerVideoLayer.tsx (montado dentro de AppShell, sobre el mapa)
function PeerVideoLayer({ map }: { map: L.Map }) {
  const remoteStreams = useStore((s) => s.remoteStreams);
  const peers = useStore((s) => s.peers);
  const watching = useStore((s) => s.watching);
  // por cada peerId en watching con stream + posición conocida:
  //   pt = map.latLngToContainerPoint([peer.lat, peer.lng])
  //   <video autoPlay muted playsInline ref=bind(stream)
  //          style={{ left: pt.x - 60, top: pt.y - 110, width: 120, height: 90 }} />
  // re-posicionar en map.on("move zoom")
}
```

- Thumbnail por defecto **apagado**. En el popup del par, botón "▶ Ver cámara" →
  `watchPeer(id)` (y opcionalmente pide al par que transmita).
- `muted playsInline` obligatorio para autoplay en móvil.
- Tocar el thumbnail → expandir a pantalla / PiP.
- Anclar el video ~110px arriba del marcador (`top: pt.y - 110`), centrado.

## 7. Configuración / despliegue

```bash
# .env (relay ya existente sirve para señalización)
NEXT_PUBLIC_RELAY_URL=wss://tu-relay
# TURN — necesario con Starlink/CGNAT y la mayoría de redes celulares
NEXT_PUBLIC_TURN_URL=turn:tu-turn:3478
NEXT_PUBLIC_TURN_USER=irma
NEXT_PUBLIC_TURN_PASS=...
```

TURN: levantar **coturn** en el mismo host del relay, o usar un TURN gestionado (Twilio,
Cloudflare Calls, metered.ca). Sin TURN, el video falla detrás de Starlink/CGNAT.

## 8. Límites y realidades

| Tema | Realidad |
|---|---|
| LoRa / fuera de red | **Sin video.** WebRTC necesita IP routing. Máximo: snapshot JPEG bajo demanda por el camino `media` actual. |
| Starlink | Funciona vía TURN. Subida del terminal compartido es el cuello — 3-4 cámaras tope. |
| Escala | Malla hasta ~6-8 nodos. Más → SFU. |
| Batería | Cámara + encode + subida drena rápido. Apagar por defecto, encender por unidad. |
| Privacidad | Operadores deben optar por transmitir (`startVideo`), no forzado. |

## 9. Plan de implementación (orden)

1. `SignalPacket` (t=7) en `packet.ts` + códec + relay-only en `fitsInFrame`.
2. `lib/webrtc/mesh.ts` — clase `WebRTCMesh`.
3. Store: estado `videoBroadcasting/remoteStreams/watching` + acciones + cablear malla + caso `signal` en `applyPacket`.
4. `PeerVideoLayer.tsx` + montaje en `AppShell` + botón "Ver cámara" en popup del par.
5. Config TURN (env + coturn) y prueba en 2 dispositivos, luego en Starlink.
6. (Opcional) reusar la malla para **llamadas de voz** — solo agregar pista de audio.
```
