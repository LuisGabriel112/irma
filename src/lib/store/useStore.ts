import { create } from "zustand";
import type {
  Affiliation,
  Alert,
  AlertType,
  ChatMessage,
  LatLng,
  Marker,
  MarkerType,
  MediaKind,
  Peer,
  UnitStatus,
} from "@/lib/types";
import { base64Bytes, buildDataUrl, splitDataUrl } from "@/lib/util/media";
import { decode, encode, type Packet } from "@/lib/protocol/packet";
import { haversine } from "@/lib/geo/utils";
import { WebRTCMesh } from "@/lib/webrtc/mesh";
import { TransportManager } from "@/lib/transport/manager";
import type {
  ConnectOptions,
  TransportKind,
  TransportState,
} from "@/lib/transport/types";
import { clearIdentity, loadIdentity, saveIdentity, type Identity } from "@/lib/util/identity";
import { clearSession, loadSession, saveSession } from "@/lib/util/session";

export type Tool =
  | "pan"
  | "marker-friend"
  | "marker-hostile"
  | "marker-neutral"
  | "marker-point"
  | "draw-line"
  | "draw-polygon"
  | "draw-circle"
  | "measure"
  | "set-self";

export interface SelfState {
  id: string;
  callsign: string;
  team: string;
  affiliation: Affiliation; // how teammates render this unit
  room: string; // default net / room code
  secret?: string; // shared passphrase for room E2E encryption (local only)
  status: UnitStatus; // operational status broadcast to the team
  posManual?: boolean; // user pinned position by hand — don't let coarse GPS overwrite it
  lat?: number;
  lng?: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  battery?: number;
  gpsTs?: number;
}

interface Connection {
  kind?: TransportKind;
  state: TransportState;
  info?: string;
}

export interface StoreState {
  self: SelfState;
  peers: Record<string, Peer>;
  markers: Record<string, Marker>;
  messages: ChatMessage[];
  alerts: Record<string, Alert>; // active distress beacons (own + received)
  unread: number;
  connection: Connection;
  log: string[];
  tool: Tool;
  followSelf: boolean;
  flyToId: string | null; // map watches this to recenter on a unit/marker
  navTargetId: string | null; // bloodhound: peer/marker id to navigate toward
  draft: LatLng[]; // in-progress drawing vertices (line/polygon/circle)
  setupComplete: boolean; // first-run identity setup done — gates the map

  // live video + voice (WebRTC, relay-only) — all ephemeral, never persisted
  videoBroadcasting: boolean; // own camera is live to the mesh
  localStream: MediaStream | null; // own camera (self preview)
  watching: string[]; // peer ids whose camera we want to see
  remoteStreams: Record<string, MediaStream>; // peerId -> inbound video
  remoteAudio: Record<string, MediaStream>; // peerId -> inbound voice
  voiceArmed: boolean; // mic acquired and added to peers
  talking: boolean; // push-to-talk currently held

  // breadcrumb trails (own + peers), ephemeral
  trails: Record<string, LatLng[]>; // id -> recent positions (oldest first)
  trailsOn: boolean; // render trails on the map
  gridOn: boolean; // render the MGRS grid overlay

  // identity
  hydrateIdentity(): void;
  persistIdentity(): void;
  hydrateSession(): void; // restore persisted markers + chat after mount
  setCallsign(callsign: string): void;
  setTeam(team: string): void;
  completeSetup(input: {
    callsign: string;
    team: string;
    room: string;
    secret?: string;
    affiliation: Affiliation;
    position?: { lat: number; lng: number; accuracy?: number; manual?: boolean };
  }): void;
  editIdentity(): void; // reopen the setup gate
  logout(): Promise<void>; // sign out: disconnect, wipe identity, back to setup gate

  // ui
  setTool(tool: Tool): void;
  setFollowSelf(v: boolean): void;
  requestFlyTo(id: string): void;
  setNavTarget(id: string | null): void;
  markRead(): void;

  // gps / self
  setSelfPosition(p: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }): void;
  setSelfPositionManual(lat: number, lng: number): void;
  setBattery(level: number): void;

  // link
  connect(kind: TransportKind, opts?: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;

  // outbound
  broadcastPosition(): void;
  sendMessage(text: string, to?: string): void;
  sendMedia(input: {
    kind: MediaKind;
    dataUrl: string;
    dur?: number;
    caption?: string;
    to?: string;
  }): void;
  placeMarker(input: {
    type: MarkerType;
    affiliation: Affiliation;
    coords: LatLng[];
    radius?: number;
    label?: string;
    remark?: string;
    color?: string;
  }): Marker;
  removeMarker(id: string): void;

  // drawing (line/polygon/circle)
  addDraftPoint(p: LatLng): void;
  undoDraftPoint(): void;
  clearDraft(): void;
  commitDraft(): void;

  // live video + voice
  startVideo(): Promise<void>;
  stopVideo(): void;
  watchPeer(peerId: string): void;
  unwatchPeer(peerId: string): void;
  setTalking(on: boolean): Promise<void>;

  // unit status + trails
  setStatus(status: UnitStatus): void;
  toggleTrails(): void;
  toggleGrid(): void;

  // alerts (distress beacons)
  raiseAlert(type: AlertType): void;
  clearAlert(id: string): void;

  // inbound
  ingestLine(line: string): void;
  pruneStale(maxAgeMs?: number): void;
}

const now = () => Date.now();

// Breadcrumb trail: cap length and skip points that barely moved, so the trail
// stays cheap and readable. Distance check is a rough degrees threshold (~10 m).
const TRAIL_MAX = 80;
const TRAIL_MIN_DEG = 0.00009; // ~10 m
function appendTrail(
  trails: Record<string, LatLng[]>,
  id: string,
  p: LatLng,
): Record<string, LatLng[]> {
  const prev = trails[id] ?? [];
  const last = prev[prev.length - 1];
  if (last && Math.abs(last.lat - p.lat) < TRAIL_MIN_DEG && Math.abs(last.lng - p.lng) < TRAIL_MIN_DEG) {
    return trails;
  }
  return { ...trails, [id]: [...prev, p].slice(-TRAIL_MAX) };
}

const stamp = (msg: string) =>
  `${new Date().toLocaleTimeString([], { hour12: false })} ${msg}`;

function applyPacket(state: StoreState, p: Packet, set: SetFn): void {
  switch (p.kind) {
    case "position": {
      if (p.id === state.self.id) return; // ignore echoes of self
      // A peer broadcasts its own position as affiliation "self"; from our POV a
      // teammate on the net is a friendly, so remap. Explicit affiliations
      // (hostile/neutral) — e.g. from the simulator — are preserved.
      const affiliation = p.affiliation === "self" ? "friend" : p.affiliation;
      const peer: Peer = {
        id: p.id,
        callsign: p.callsign,
        affiliation,
        lat: p.lat,
        lng: p.lng,
        heading: p.heading,
        speed: p.speed,
        accuracy: p.accuracy,
        battery: p.battery,
        status: p.status,
        lastSeen: p.ts || now(),
      };
      set((s) => ({
        peers: { ...s.peers, [peer.id]: peer },
        trails: appendTrail(s.trails, peer.id, { lat: peer.lat, lng: peer.lng }),
      }));
      break;
    }
    case "message": {
      if (p.to && p.to !== state.self.callsign) return; // not addressed to us
      const msg: ChatMessage = {
        id: p.id,
        from: p.from,
        to: p.to,
        text: p.text,
        ts: p.ts || now(),
        self: false,
      };
      set((s) => ({ messages: [...s.messages, msg].slice(-300), unread: s.unread + 1 }));
      break;
    }
    case "marker": {
      const marker: Marker = {
        id: p.id,
        type: p.markerType,
        affiliation: p.affiliation,
        label: p.label,
        coords: p.coords,
        color: p.color,
        symbol: p.symbol,
        remark: p.remark,
        createdBy: p.by,
        createdAt: p.ts || now(),
      };
      set((s) => ({ markers: { ...s.markers, [marker.id]: marker } }));
      break;
    }
    case "marker-delete": {
      set((s) => {
        if (!s.markers[p.id]) return {};
        const next = { ...s.markers };
        delete next[p.id];
        return { markers: next };
      });
      break;
    }
    case "ping": {
      const note: ChatMessage = {
        id: p.id,
        from: p.from,
        text: "◎ PING",
        ts: p.ts || now(),
        self: false,
      };
      set((s) => ({ messages: [...s.messages, note].slice(-300), unread: s.unread + 1 }));
      break;
    }
    case "alert": {
      const alert: Alert = {
        id: p.id,
        from: p.from,
        type: p.alertType,
        lat: p.lat,
        lng: p.lng,
        ts: p.ts || now(),
      };
      set((s) => ({ alerts: { ...s.alerts, [alert.id]: alert } }));
      break;
    }
    case "media": {
      if (p.to && p.to !== state.self.callsign) return; // not addressed to us
      const msg: ChatMessage = {
        id: p.id,
        from: p.from,
        to: p.to,
        text: p.caption ?? "",
        media: { kind: p.mediaKind, data: buildDataUrl(p.mime, p.data), mime: p.mime, dur: p.dur },
        ts: p.ts || now(),
        self: false,
      };
      set((s) => ({ messages: [...s.messages, msg].slice(-300), unread: s.unread + 1 }));
      break;
    }
  }
}

type SetFn = (
  partial:
    | Partial<StoreState>
    | ((state: StoreState) => Partial<StoreState>),
) => void;

export const useStore = create<StoreState>()((set, get) => {
  const manager = new TransportManager({
    onLine: (line) => get().ingestLine(line),
    onState: (state, info) =>
      set((s) => ({ connection: { ...s.connection, state, info } })),
    onLog: (msg) => set((s) => ({ log: [stamp(msg), ...s.log].slice(0, 200) })),
  });

  // WebRTC live-video mesh. Signaling rides the active relay transport; media is
  // peer-to-peer. Inbound signal packets are routed here from ingestLine.
  const mesh = new WebRTCMesh(
    "self-local",
    (to, signal) => {
      const s = get().self;
      void manager.send(
        encode({ kind: "signal", id: `${s.id}-${now()}`, from: s.id, to, signal, ts: now() }),
      );
    },
    (peerId, kind, stream) =>
      set((s) => {
        const key = kind === "audio" ? "remoteAudio" : "remoteStreams";
        const next = { ...s[key] };
        if (stream) next[peerId] = stream;
        else delete next[peerId];
        return { [key]: next };
      }),
    (msg) => set((s) => ({ log: [stamp(msg), ...s.log].slice(0, 200) })),
  );

  return {
    // Deterministic SSR-safe default; real identity is hydrated client-side
    // post-mount via hydrateIdentity() to avoid React hydration mismatches.
    self: {
      id: "self-local",
      callsign: "RAVEN-1",
      team: "Cyan",
      affiliation: "friend",
      room: "alfa",
      status: "ok",
    },
    peers: {},
    markers: {},
    messages: [],
    alerts: {},
    unread: 0,
    connection: { state: "disconnected" },
    log: [],
    tool: "pan",
    followSelf: true,
    flyToId: null,
    navTargetId: null,
    draft: [],
    setupComplete: false,
    videoBroadcasting: false,
    localStream: null,
    watching: [],
    remoteStreams: {},
    remoteAudio: {},
    voiceArmed: false,
    talking: false,
    trails: {},
    trailsOn: false,
    gridOn: false,

    persistIdentity: () => {
      const s = get().self;
      saveIdentity({
        id: s.id,
        callsign: s.callsign,
        team: s.team,
        affiliation: s.affiliation,
        room: s.room,
        secret: s.secret,
        ready: get().setupComplete,
        // Persist a hand-pinned position only; live GPS fixes are ephemeral and
        // re-acquired each session, so we don't want a stale auto-fix restored.
        ...(s.posManual && s.lat != null && s.lng != null
          ? { lat: s.lat, lng: s.lng, posManual: true }
          : {}),
      });
    },

    setCallsign: (callsign) => {
      const trimmed = callsign.trim().toUpperCase().slice(0, 16) || "RAVEN-1";
      set((s) => ({ self: { ...s.self, callsign: trimmed } }));
      get().persistIdentity();
    },
    setTeam: (team) => {
      set((s) => ({ self: { ...s.self, team } }));
      get().persistIdentity();
    },
    hydrateIdentity: () => {
      const id = loadIdentity();
      set((s) => ({
        self: {
          ...s.self,
          id: id.id,
          callsign: id.callsign,
          team: id.team,
          affiliation: id.affiliation,
          room: id.room,
          secret: id.secret,
          // Restore a hand-pinned position so the operator's real location
          // survives reloads instead of falling back to a coarse IP fix.
          ...(id.posManual && id.lat != null && id.lng != null
            ? { lat: id.lat, lng: id.lng, posManual: true }
            : {}),
        },
        setupComplete: id.ready,
      }));
      mesh.setSelfId(id.id);
    },

    completeSetup: (input) => {
      const callsign = input.callsign.trim().toUpperCase().slice(0, 16) || "RAVEN-1";
      const room = input.room.trim().toLowerCase().slice(0, 24) || "alfa";
      const secret = input.secret?.trim() || undefined;
      set((s) => ({
        self: {
          ...s.self,
          callsign,
          team: input.team,
          room,
          secret,
          affiliation: input.affiliation,
          ...(input.position
            ? {
                lat: input.position.lat,
                lng: input.position.lng,
                accuracy: input.position.accuracy,
                posManual: input.position.manual ?? false,
                gpsTs: now(),
              }
            : {}),
        },
        setupComplete: true,
      }));
      get().persistIdentity();
      mesh.setSelfId(get().self.id);
    },

    hydrateSession: () => {
      const { markers, messages } = loadSession();
      set({ markers, messages });
    },

    editIdentity: () => set({ setupComplete: false }),

    logout: async () => {
      mesh.destroy();
      await manager.disconnect();
      clearIdentity();
      clearSession(); // wipe persisted markers + chat on sign-out
      const fresh = loadIdentity(); // mints a new random identity (ready: false)
      mesh.setSelfId(fresh.id);
      set({
        self: {
          id: fresh.id,
          callsign: fresh.callsign,
          team: fresh.team,
          affiliation: fresh.affiliation,
          room: fresh.room,
          status: "ok",
        },
        peers: {},
        markers: {},
        messages: [],
        alerts: {},
        unread: 0,
        log: [],
        connection: { state: "disconnected" },
        navTargetId: null,
        setupComplete: false,
        videoBroadcasting: false,
        localStream: null,
        watching: [],
        remoteStreams: {},
        remoteAudio: {},
        voiceArmed: false,
        talking: false,
        trails: {},
      });
    },

    setTool: (tool) => set({ tool, draft: [] }),
    setFollowSelf: (followSelf) => set({ followSelf }),
    requestFlyTo: (id) => set({ flyToId: `${id}:${now()}` }),
    setNavTarget: (navTargetId) => set({ navTargetId }),
    markRead: () => set({ unread: 0 }),

    setSelfPosition: (p) =>
      set((s) => ({
        self: {
          ...s.self,
          lat: p.lat,
          lng: p.lng,
          heading: p.heading ?? s.self.heading,
          speed: p.speed,
          accuracy: p.accuracy,
          gpsTs: now(),
        },
      })),
    setSelfPositionManual: (lat, lng) => {
      set((s) => ({
        self: {
          ...s.self,
          lat,
          lng,
          accuracy: undefined, // hand-pinned: no GPS error ring
          posManual: true,
          gpsTs: now(),
        },
        followSelf: true,
      }));
      get().persistIdentity(); // remember the pinned spot across reloads
    },
    setBattery: (battery) => set((s) => ({ self: { ...s.self, battery } })),

    connect: async (kind, opts) => {
      const self = get().self;
      const center =
        self.lat != null && self.lng != null
          ? { lat: self.lat, lng: self.lng }
          : undefined;
      set((s) => ({
        connection: { ...s.connection, kind, state: "connecting" },
      }));
      try {
        // Arm room E2E encryption before any traffic flows. Empty passphrase =
        // cleartext (legacy). Throws on insecure context if a passphrase is set.
        await manager.setSecret(self.secret ?? "", self.room);
        await manager.connect(kind, { center, ...opts });
        set((s) => ({ connection: { ...s.connection, kind } }));
      } catch (e) {
        set((s) => ({
          connection: { ...s.connection, kind, state: "error", info: (e as Error).message },
          log: [stamp(`connect failed: ${(e as Error).message}`), ...s.log].slice(0, 200),
        }));
        throw e;
      }
    },
    disconnect: async () => {
      mesh.destroy();
      await manager.disconnect();
      set({
        peers: {},
        connection: { state: "disconnected" },
        videoBroadcasting: false,
        localStream: null,
        watching: [],
        remoteStreams: {},
        remoteAudio: {},
        voiceArmed: false,
        talking: false,
        trails: {},
      });
    },

    broadcastPosition: () => {
      const s = get().self;
      if (s.lat == null || s.lng == null) return;
      const packet: Packet = {
        kind: "position",
        id: s.id,
        callsign: s.callsign,
        affiliation: s.affiliation,
        lat: s.lat,
        lng: s.lng,
        heading: s.heading,
        speed: s.speed,
        accuracy: s.accuracy,
        battery: s.battery,
        status: s.status,
        ts: now(),
      };
      void manager.send(encode(packet));
      set((st) => ({ trails: appendTrail(st.trails, s.id, { lat: s.lat!, lng: s.lng! }) }));
      // Reuse the 5s beacon to pull any newly-seen peers into the video mesh.
      if (get().videoBroadcasting) void mesh.startBroadcast(Object.keys(get().peers));
    },

    sendMessage: (text, to) => {
      const body = text.trim();
      if (!body) return;
      const s = get().self;
      const msg: ChatMessage = {
        id: `${s.id}-${now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: s.callsign,
        to,
        text: body,
        ts: now(),
        self: true,
      };
      set((st) => ({ messages: [...st.messages, msg].slice(-300) }));
      void manager.send(
        encode({ kind: "message", id: msg.id, from: msg.from, to, text: body, ts: msg.ts }),
      );
    },

    sendMedia: (input) => {
      const s = get().self;
      const { mime, base64 } = splitDataUrl(input.dataUrl);
      // Sealing re-base64s the whole encoded line, so an encrypted attachment is
      // ~1.8x its raw size on the wire vs ~1.3x in the clear. Tighten the cap when
      // a room key is set so the sealed frame still fits the relay's ~1 MB limit.
      const maxRaw = s.secret?.trim() ? 520_000 : 950_000;
      if (base64Bytes(base64) > maxRaw) {
        const kb = Math.round(maxRaw / 1000);
        set((st) => ({
          log: [stamp(`Adjunto demasiado grande para el relay (máx ~${kb} KB)`), ...st.log].slice(0, 200),
        }));
        return;
      }
      const msg: ChatMessage = {
        id: `${s.id}-${now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: s.callsign,
        to: input.to,
        text: input.caption ?? "",
        media: { kind: input.kind, data: input.dataUrl, mime, dur: input.dur },
        ts: now(),
        self: true,
      };
      set((st) => ({ messages: [...st.messages, msg].slice(-300) }));

      const conn = get().connection;
      if (conn.kind === "websocket" && conn.state === "connected") {
        void manager.send(
          encode({
            kind: "media",
            id: msg.id,
            from: msg.from,
            to: input.to,
            mediaKind: input.kind,
            mime,
            data: base64,
            caption: input.caption,
            dur: input.dur,
            ts: msg.ts,
          }),
        );
      } else {
        set((st) => ({
          log: [stamp("Adjunto local — conéctate por relay (internet) para enviarlo"), ...st.log].slice(0, 200),
        }));
      }
    },

    placeMarker: (input) => {
      const s = get().self;
      const marker: Marker = {
        id: `${s.id}-mk-${now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: input.type,
        affiliation: input.affiliation,
        label: input.label,
        coords: input.coords,
        radius: input.radius,
        color: input.color,
        remark: input.remark,
        createdBy: s.callsign,
        createdAt: now(),
      };
      set((st) => ({ markers: { ...st.markers, [marker.id]: marker } }));
      void manager.send(
        encode({
          kind: "marker",
          id: marker.id,
          markerType: marker.type,
          affiliation: marker.affiliation,
          label: marker.label,
          coords: marker.coords,
          radius: marker.radius,
          color: marker.color,
          remark: marker.remark,
          by: marker.createdBy,
          ts: marker.createdAt,
        }),
      );
      return marker;
    },

    addDraftPoint: (p) => set((s) => ({ draft: [...s.draft, p] })),
    undoDraftPoint: () => set((s) => ({ draft: s.draft.slice(0, -1) })),
    clearDraft: () => set({ draft: [] }),
    commitDraft: () => {
      const { tool, draft } = get();
      const DRAW_COLOR = "#7dd3fc"; // light blue — own tactical graphics
      if (tool === "draw-circle") {
        if (draft.length < 2) return;
        get().placeMarker({
          type: "circle",
          affiliation: "friend",
          coords: [draft[0]],
          radius: haversine(draft[0], draft[1]),
          color: DRAW_COLOR,
        });
      } else if (tool === "draw-line" || tool === "draw-polygon") {
        const min = tool === "draw-polygon" ? 3 : 2;
        if (draft.length < min) return;
        get().placeMarker({
          type: tool === "draw-polygon" ? "polygon" : "line",
          affiliation: "friend",
          coords: draft,
          color: DRAW_COLOR,
        });
      }
      set({ draft: [] });
    },

    startVideo: async () => {
      const conn = get().connection;
      if (conn.kind !== "websocket" || conn.state !== "connected") {
        set((s) => ({
          log: [stamp("Video requiere enlace por relay (internet)"), ...s.log].slice(0, 200),
        }));
        return;
      }
      try {
        const targets = Object.keys(get().peers);
        const stream = await mesh.startBroadcast(targets);
        set((s) => ({
          videoBroadcasting: true,
          localStream: stream,
          log: [stamp("Cámara en vivo emitiendo a la malla"), ...s.log].slice(0, 200),
        }));
      } catch (e) {
        set((s) => ({
          log: [stamp(`No se pudo iniciar la cámara: ${(e as Error).message}`), ...s.log].slice(0, 200),
        }));
      }
    },
    stopVideo: () => {
      mesh.stopBroadcast();
      set({ videoBroadcasting: false, localStream: null });
    },
    watchPeer: (peerId) => {
      mesh.watch(peerId);
      set((s) => (s.watching.includes(peerId) ? {} : { watching: [...s.watching, peerId] }));
    },
    unwatchPeer: (peerId) => {
      // UI-only: stop showing the thumbnail. Keep the connection + stream so
      // re-watching is instant (no need for the broadcaster to re-offer).
      set((s) => ({ watching: s.watching.filter((id) => id !== peerId) }));
    },

    setTalking: async (on) => {
      const conn = get().connection;
      if (conn.kind !== "websocket" || conn.state !== "connected") return;
      if (on && !get().voiceArmed) {
        try {
          await mesh.armVoice(Object.keys(get().peers));
          set({ voiceArmed: true });
        } catch (e) {
          set((s) => ({
            log: [stamp(`No se pudo abrir el micrófono: ${(e as Error).message}`), ...s.log].slice(0, 200),
          }));
          return;
        }
      }
      mesh.setTalking(on);
      set({ talking: on });
    },

    setStatus: (status) => {
      set((s) => ({ self: { ...s.self, status } }));
      if (get().connection.state === "connected") get().broadcastPosition();
    },

    toggleTrails: () => set((s) => ({ trailsOn: !s.trailsOn })),

    toggleGrid: () => set((s) => ({ gridOn: !s.gridOn })),

    raiseAlert: (type) => {
      const s = get().self;
      if (s.lat == null || s.lng == null) {
        set((st) => ({
          log: [stamp("No se puede emitir alerta sin posición"), ...st.log].slice(0, 200),
        }));
        return;
      }
      const alert: Alert = {
        id: `${s.id}-al-${now()}`,
        from: s.callsign,
        type,
        lat: s.lat,
        lng: s.lng,
        ts: now(),
      };
      set((st) => ({
        alerts: { ...st.alerts, [alert.id]: alert },
        log: [stamp(`⚠ Alerta ${type.toUpperCase()} emitida`), ...st.log].slice(0, 200),
      }));
      void manager.send(
        encode({
          kind: "alert",
          id: alert.id,
          from: alert.from,
          alertType: type,
          lat: alert.lat,
          lng: alert.lng,
          ts: alert.ts,
        }),
      );
    },

    clearAlert: (id) =>
      set((s) => {
        if (!s.alerts[id]) return {};
        const next = { ...s.alerts };
        delete next[id];
        return { alerts: next };
      }),

    removeMarker: (id) => {
      set((s) => {
        if (!s.markers[id]) return {};
        const next = { ...s.markers };
        delete next[id];
        return { markers: next };
      });
      void manager.send(encode({ kind: "marker-delete", id, ts: now() }));
    },

    ingestLine: (line) => {
      const packet = decode(line);
      if (!packet) return;
      if (packet.kind === "signal") {
        if (packet.to === get().self.id) void mesh.onSignal(packet.from, packet.signal);
        return;
      }
      applyPacket(get(), packet, set);
    },

    pruneStale: (maxAgeMs = 5 * 60_000) => {
      const cutoff = now() - maxAgeMs;
      set((s) => {
        const next: Record<string, Peer> = {};
        for (const [id, p] of Object.entries(s.peers)) {
          if (p.lastSeen >= cutoff) next[id] = p;
        }
        // Drop trails of dropped peers; keep our own (id not in peers).
        const trails: Record<string, LatLng[]> = {};
        for (const [id, t] of Object.entries(s.trails)) {
          if (next[id] || id === s.self.id) trails[id] = t;
        }
        return { peers: next, trails };
      });
    },
  };
});

// Auto-persist operator-authored content. One subscription covers every mutation
// path (local placeMarker/sendMessage and inbound packets via applyPacket), so we
// don't have to remember to save in each action. Writes only when the persisted
// slices actually change, to avoid thrashing localStorage on peer/GPS updates.
if (typeof window !== "undefined") {
  let prevMarkers = useStore.getState().markers;
  let prevMessages = useStore.getState().messages;
  useStore.subscribe((state) => {
    if (state.markers !== prevMarkers || state.messages !== prevMessages) {
      prevMarkers = state.markers;
      prevMessages = state.messages;
      saveSession({ markers: state.markers, messages: state.messages });
    }
  });
}
