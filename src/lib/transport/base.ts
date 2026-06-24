import type {
  ConnectOptions,
  Transport,
  TransportCallbacks,
  TransportKind,
  TransportState,
} from "@/lib/transport/types";

/**
 * Shared transport plumbing: state tracking and newline framing. Byte-oriented
 * links (serial, BLE) feed raw decoded text through `ingest`, which emits one
 * `onLine` per complete frame.
 */
export abstract class BaseTransport implements Transport {
  abstract readonly kind: TransportKind;
  protected state: TransportState = "disconnected";
  protected cb: TransportCallbacks;
  private buf = "";

  constructor(cb: TransportCallbacks) {
    this.cb = cb;
  }

  getState(): TransportState {
    return this.state;
  }

  protected setState(state: TransportState, info?: string): void {
    this.state = state;
    this.cb.onState(state, info);
  }

  protected log(msg: string): void {
    this.cb.onLog(msg);
  }

  protected ingest(chunk: string): void {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, idx).replace(/\r$/, "");
      this.buf = this.buf.slice(idx + 1);
      if (line.trim()) this.cb.onLine(line);
    }
    // Drop a runaway buffer (binary garbage / a peer with no framing).
    if (this.buf.length > 65536) this.buf = "";
  }

  abstract connect(opts?: ConnectOptions): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(line: string): Promise<void>;
}
