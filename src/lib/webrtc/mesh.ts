import type { SignalBody } from "@/lib/protocol/packet";

/**
 * Full-mesh WebRTC manager for live peer video.
 *
 * Owns one RTCPeerConnection per peer. Signaling (SDP/ICE) is ferried out via a
 * callback (the store wires it to the active relay transport); the media itself
 * flows peer-to-peer and never touches the relay. Uses the "perfect negotiation"
 * pattern to survive simultaneous offers (glare): the peer with the lower id is
 * polite and yields on collision.
 *
 * Mesh scales to small teams (~6-8 nodes). Beyond that an SFU is needed.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  // TURN is required behind CGNAT (Starlink, most cellular). Configured at build
  // time; absent in dev, where host-LAN peers usually connect via STUN alone.
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL,
          username: process.env.NEXT_PUBLIC_TURN_USER,
          credential: process.env.NEXT_PUBLIC_TURN_PASS,
        },
      ]
    : []),
];

type SignalOut = (to: string, signal: SignalBody) => void;
type OnRemote = (peerId: string, stream: MediaStream | null) => void;
type OnLog = (msg: string) => void;

interface PeerConn {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  polite: boolean;
}

export function videoSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export class WebRTCMesh {
  private conns = new Map<string, PeerConn>();
  private localStream?: MediaStream;
  private selfId: string;
  private signalOut: SignalOut;
  private onRemote: OnRemote;
  private onLog: OnLog;

  constructor(selfId: string, signalOut: SignalOut, onRemote: OnRemote, onLog: OnLog) {
    this.selfId = selfId;
    this.signalOut = signalOut;
    this.onRemote = onRemote;
    this.onLog = onLog;
  }

  /** Keep the routing key fresh across logout/identity changes. */
  setSelfId(id: string): void {
    this.selfId = id;
  }

  get broadcasting(): boolean {
    return !!this.localStream;
  }

  /** Acquire the camera and start offering to the given peers. */
  async startBroadcast(targets: string[]): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false,
      });
    }
    for (const id of targets) this.addTracksTo(this.ensureConn(id));
    return this.localStream;
  }

  stopBroadcast(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    // Renegotiate down: drop senders. Simplest is to tear connections; peers we
    // still watch re-open on demand when their next signal arrives.
    for (const id of [...this.conns.keys()]) this.close(id);
  }

  /** Open (or reuse) a receive-only connection to watch a peer's camera. */
  watch(peerId: string): void {
    this.ensureConn(peerId);
  }

  unwatch(peerId: string): void {
    // Only close if we are not broadcasting to them; otherwise keep the uplink.
    if (!this.localStream) this.close(peerId);
  }

  private addTracksTo(entry: PeerConn): void {
    if (!this.localStream) return;
    const existing = new Set(entry.pc.getSenders().map((s) => s.track));
    for (const track of this.localStream.getTracks()) {
      if (!existing.has(track)) entry.pc.addTrack(track, this.localStream);
    }
  }

  private ensureConn(peerId: string): PeerConn {
    const found = this.conns.get(peerId);
    if (found) return found;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerConn = { pc, makingOffer: false, polite: this.selfId < peerId };
    this.conns.set(peerId, entry);

    if (this.localStream) this.addTracksTo(entry);

    pc.ontrack = (e) => this.onRemote(peerId, e.streams[0] ?? null);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signalOut(peerId, { candidate: e.candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) this.signalOut(peerId, pc.localDescription.toJSON());
      } catch (err) {
        this.onLog(`video: negotiation error (${(err as Error).message})`);
      } finally {
        entry.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        this.onRemote(peerId, null);
      }
    };
    return entry;
  }

  /** Inbound signaling from a peer (relay -> store -> here). */
  async onSignal(from: string, signal: SignalBody): Promise<void> {
    const entry = this.ensureConn(from);
    const pc = entry.pc;
    try {
      if ("candidate" in signal) {
        await pc.addIceCandidate(signal.candidate).catch(() => {}); // ignore benign glare drops
        return;
      }
      const collision =
        signal.type === "offer" && (entry.makingOffer || pc.signalingState !== "stable");
      if (collision && !entry.polite) return; // impolite peer ignores the colliding offer
      await pc.setRemoteDescription(signal);
      if (signal.type === "offer") {
        await pc.setLocalDescription();
        if (pc.localDescription) this.signalOut(from, pc.localDescription.toJSON());
      }
    } catch (err) {
      this.onLog(`video: signal error (${(err as Error).message})`);
    }
  }

  private close(peerId: string): void {
    this.conns.get(peerId)?.pc.close();
    this.conns.delete(peerId);
    this.onRemote(peerId, null);
  }

  destroy(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    for (const id of [...this.conns.keys()]) this.close(id);
  }
}
