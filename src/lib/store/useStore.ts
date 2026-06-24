import { create } from "zustand";
import type {
  Affiliation,
  Alert,
  AlertType,
  ChatMessage,
  LatLng,
  Marker,
  MarkerType,
  Peer,
} from "@/lib/types";
import { decode, encode, type Packet } from "@/lib/protocol/packet";
import { haversine } from "@/lib/geo/utils";
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

  // alerts (distress beacons)
  raiseAlert(type: AlertType): void;
  clearAlert(id: string): void;

  // inbound
  ingestLine(line: string): void;
  pruneStale(maxAgeMs?: number): void;
}

const now = () => Date.now();
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
        lastSeen: p.ts || now(),
      };
      set((s) => ({ peers: { ...s.peers, [peer.id]: peer } }));
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

  return {
    // Deterministic SSR-safe default; real identity is hydrated client-side
    // post-mount via hydrateIdentity() to avoid React hydration mismatches.
    self: {
      id: "self-local",
      callsign: "RAVEN-1",
      team: "Cyan",
      affiliation: "friend",
      room: "alfa",
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

    persistIdentity: () => {
      const s = get().self;
      saveIdentity({
        id: s.id,
        callsign: s.callsign,
        team: s.team,
        affiliation: s.affiliation,
        room: s.room,
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
          // Restore a hand-pinned position so the operator's real location
          // survives reloads instead of falling back to a coarse IP fix.
          ...(id.posManual && id.lat != null && id.lng != null
            ? { lat: id.lat, lng: id.lng, posManual: true }
            : {}),
        },
        setupComplete: id.ready,
      }));
    },

    completeSetup: (input) => {
      const callsign = input.callsign.trim().toUpperCase().slice(0, 16) || "RAVEN-1";
      const room = input.room.trim().toLowerCase().slice(0, 24) || "alfa";
      set((s) => ({
        self: {
          ...s.self,
          callsign,
          team: input.team,
          room,
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
    },

    hydrateSession: () => {
      const { markers, messages } = loadSession();
      set({ markers, messages });
    },

    editIdentity: () => set({ setupComplete: false }),

    logout: async () => {
      await manager.disconnect();
      clearIdentity();
      clearSession(); // wipe persisted markers + chat on sign-out
      const fresh = loadIdentity(); // mints a new random identity (ready: false)
      set({
        self: {
          id: fresh.id,
          callsign: fresh.callsign,
          team: fresh.team,
          affiliation: fresh.affiliation,
          room: fresh.room,
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
      await manager.disconnect();
      set({ peers: {}, connection: { state: "disconnected" } });
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
        ts: now(),
      };
      void manager.send(encode(packet));
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
      applyPacket(get(), packet, set);
    },

    pruneStale: (maxAgeMs = 5 * 60_000) => {
      const cutoff = now() - maxAgeMs;
      set((s) => {
        const next: Record<string, Peer> = {};
        for (const [id, p] of Object.entries(s.peers)) {
          if (p.lastSeen >= cutoff) next[id] = p;
        }
        return { peers: next };
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
