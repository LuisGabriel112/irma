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
 */
export class TransportManager {
  private active?: Transport;
  private cb: TransportCallbacks;

  constructor(cb: TransportCallbacks) {
    this.cb = cb;
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
    await this.active?.send(line);
  }
}
