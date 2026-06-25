import type { SignalBody } from "@/lib/protocol/packet";

/**
 * Full-mesh WebRTC manager for live peer video + voice.
 *
 * Owns one RTCPeerConnection per peer. Signaling (SDP/ICE) is ferried out via a
 * callback (the store wires it to the active relay transport); the media itself
 * flows peer-to-peer and never touches the relay. Uses the "perfect negotiation"
 * pattern to survive simultaneous offers (glare): the peer with the lower id is
 * polite and yields on collision.
 *
 * Voice is push-to-talk: the mic track is added once (armed) then toggled via
 * track.enabled, so talking is instant with no renegotiation.
 *
 * Mesh scales to small teams (~6-8 nodes). Beyond that an SFU is needed.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
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

export type MediaKindRtc = "video" | "audio";
type SignalOut = (to: string, signal: SignalBody) => void;
type OnRemote = (peerId: string, kind: MediaKindRtc, stream: MediaStream | null) => void;
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
  private localStream?: MediaStream; // camera (video)
  private audioStream?: MediaStream; // mic (voice)
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

  setSelfId(id: string): void {
    this.selfId = id;
  }

  get broadcasting(): boolean {
    return !!this.localStream;
  }

  // --- camera / video ----------------------------------------------------

  async startBroadcast(targets: string[]): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: 320, height: 240, frameRate: 15 },
        audio: false,
      });
    }
    for (const id of targets) this.syncTracks(this.ensureConn(id));
    return this.localStream;
  }

  stopBroadcast(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    // If voice is still armed, keep the connections; otherwise tear them down.
    if (this.audioStream) {
      for (const entry of this.conns.values()) this.syncTracks(entry);
    } else {
      for (const id of [...this.conns.keys()]) this.close(id);
    }
  }

  watch(peerId: string): void {
    this.ensureConn(peerId);
  }

  // --- voice (push-to-talk) ----------------------------------------------

  /** Acquire the mic once and add it (muted) to every peer. */
  async armVoice(targets: string[]): Promise<void> {
    if (!this.audioStream) {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioStream.getAudioTracks().forEach((t) => (t.enabled = false)); // silent until PTT
    }
    for (const id of targets) this.syncTracks(this.ensureConn(id));
  }

  /** Toggle the live mic (push-to-talk). Returns whether the mic is armed. */
  setTalking(on: boolean): boolean {
    if (!this.audioStream) return false;
    this.audioStream.getAudioTracks().forEach((t) => (t.enabled = on));
    return true;
  }

  disarmVoice(): void {
    this.audioStream?.getTracks().forEach((t) => t.stop());
    this.audioStream = undefined;
    if (this.localStream) {
      for (const entry of this.conns.values()) this.syncTracks(entry);
    } else {
      for (const id of [...this.conns.keys()]) this.close(id);
    }
  }

  // --- connection plumbing -----------------------------------------------

  /** Add any local tracks (camera, mic) not yet on this connection. */
  private syncTracks(entry: PeerConn): void {
    const live = entry.pc.getSenders().map((s) => s.track);
    const add = (stream?: MediaStream) => {
      if (!stream) return;
      for (const track of stream.getTracks()) {
        if (!live.includes(track)) entry.pc.addTrack(track, stream);
      }
    };
    add(this.localStream);
    add(this.audioStream);
  }

  private ensureConn(peerId: string): PeerConn {
    const found = this.conns.get(peerId);
    if (found) return found;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerConn = { pc, makingOffer: false, polite: this.selfId < peerId };
    this.conns.set(peerId, entry);

    this.syncTracks(entry);

    pc.ontrack = (e) => this.onRemote(peerId, e.track.kind as MediaKindRtc, e.streams[0] ?? null);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signalOut(peerId, { candidate: e.candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) this.signalOut(peerId, pc.localDescription.toJSON());
      } catch (err) {
        this.onLog(`media: negotiation error (${(err as Error).message})`);
      } finally {
        entry.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        this.close(peerId);
      }
    };
    return entry;
  }

  async onSignal(from: string, signal: SignalBody): Promise<void> {
    const entry = this.ensureConn(from);
    const pc = entry.pc;
    try {
      if ("candidate" in signal) {
        await pc.addIceCandidate(signal.candidate).catch(() => {});
        return;
      }
      const collision =
        signal.type === "offer" && (entry.makingOffer || pc.signalingState !== "stable");
      if (collision && !entry.polite) return;
      await pc.setRemoteDescription(signal);
      if (signal.type === "offer") {
        await pc.setLocalDescription();
        if (pc.localDescription) this.signalOut(from, pc.localDescription.toJSON());
      }
    } catch (err) {
      this.onLog(`media: signal error (${(err as Error).message})`);
    }
  }

  private close(peerId: string): void {
    this.conns.get(peerId)?.pc.close();
    this.conns.delete(peerId);
    this.onRemote(peerId, "video", null);
    this.onRemote(peerId, "audio", null);
  }

  destroy(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.audioStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    this.audioStream = undefined;
    for (const id of [...this.conns.keys()]) this.close(id);
  }
}
