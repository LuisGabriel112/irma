import { RoomCipher } from "@/lib/crypto/room";
import { BluetoothTransport } from "@/lib/transport/bluetooth";
import { SerialTransport } from "@/lib/transport/serial";
import { SimulatedTransport } from "@/lib/transport/simulated";
import { WebSocketTransport } from "@/lib/transport/websocket";
import type {
  ConnectOptions,
  Transport,
  TransportCallbacks,
  TransportKind,
  TransportState,
} from "@/lib/transport/types";

/**
 * Owns the single active transport and routes its lifecycle/events to one set
 * of callbacks (wired into the store). Swapping links is connect(kind) — the
 * previous link is torn down first.
 *
 * This is also the single choke point for room encryption: every outbound line
 * is sealed before it hits a link and every inbound line is opened before it
 * reaches the store, so the whole protocol (position/chat/marker/media/signal)
 * is end-to-end encrypted without each call site knowing about crypto.
 */
export class TransportManager {
  private active?: Transport;
  private cb: TransportCallbacks;
  private cipher = new RoomCipher();

  constructor(cb: TransportCallbacks) {
    // Decrypt inbound lines before handing them to the store. Sealed frames that
    // fail to open (wrong/missing passphrase, tampered) are dropped silently.
    this.cb = {
      ...cb,
      onLine: (line) => {
        void this.cipher.open(line).then((plain) => {
          if (plain != null) cb.onLine(plain);
        });
      },
    };
  }

  /** Set/clear the room passphrase used to seal+open traffic. */
  async setSecret(passphrase: string, room: string): Promise<void> {
    await this.cipher.setSecret(passphrase, room);
  }

  /** True when traffic is being encrypted end-to-end. */
  get encrypted(): boolean {
    return this.cipher.enabled();
  }

  get kind(): TransportKind | undefined {
    return this.active?.kind;
  }

  getState(): TransportState {
    return this.active?.getState() ?? "disconnected";
  }

  async connect(kind: TransportKind, opts?: ConnectOptions): Promise<void> {
    await this.disconnect();
    switch (kind) {
      case "simulated":
        this.active = new SimulatedTransport(this.cb);
        break;
      case "serial":
        this.active = new SerialTransport(this.cb, opts?.baudRate);
        break;
      case "bluetooth":
        this.active = new BluetoothTransport(this.cb);
        break;
      case "websocket":
        this.active = new WebSocketTransport(this.cb);
        break;
    }
    await this.active.connect(opts);
  }

  async disconnect(): Promise<void> {
    if (!this.active) return;
    await this.active.disconnect();
    this.active = undefined;
  }

  async send(line: string): Promise<void> {
    const sealed = await this.cipher.seal(line);
    await this.active?.send(sealed);
  }
}
