import { BaseTransport } from "@/lib/transport/base";
import type { ConnectOptions, TransportKind } from "@/lib/transport/types";

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_RELAY_URL ?? "ws://localhost:1234";
const MAX_BACKOFF_MS = 15_000;

/**
 * Online transport over a WebSocket relay. Each client opens `${url}?room=${room}`;
 * the relay fans every newline-delimited frame out to the other clients in the same
 * room. The wire format is identical to the LoRa links, so the decode -> store -> map
 * path is unchanged. Auto-reconnects with exponential backoff while the user stays
 * "connected" (mobile/wifi drops are expected); a manual disconnect stops retrying.
 */
export class WebSocketTransport extends BaseTransport {
  readonly kind: TransportKind = "websocket";
  private ws?: WebSocket;
  private url = DEFAULT_URL;
  private room = "default";
  private intentionalClose = false;
  private backoff = 1000;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  async connect(opts?: ConnectOptions): Promise<void> {
    if (opts?.url) this.url = opts.url;
    if (opts?.room) this.room = opts.room.trim() || "default";
    this.intentionalClose = false;
    this.setState("connecting");
    return this.open();
  }

  private open(): Promise<void> {
    const endpoint = `${this.url.replace(/\/$/, "")}?room=${encodeURIComponent(this.room)}`;
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(endpoint);
      } catch (e) {
        this.setState("error", (e as Error).message);
        reject(e);
        return;
      }
      this.ws = ws;

      ws.onopen = () => {
        this.backoff = 1000;
        this.setState("connected", `sala ${this.room}`);
        this.log(`Relay conectado — sala ${this.room}`);
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      ws.onmessage = (ev) => {
        // Relay may batch frames; ingest() splits on newlines.
        this.ingest(typeof ev.data === "string" ? ev.data : "");
      };

      ws.onerror = () => {
        this.log(`Relay error (${endpoint})`);
        if (!settled) {
          settled = true;
          this.setState("error", "no se pudo conectar al relay");
          reject(new Error("relay no disponible"));
        }
      };

      ws.onclose = () => {
        this.ws = undefined;
        if (this.intentionalClose) return;
        // Unexpected drop: keep the user "connecting" and retry with backoff.
        this.setState("connecting", "reconectando…");
        this.log(`Relay caído — reintento en ${Math.round(this.backoff / 1000)}s`);
        this.reconnectTimer = setTimeout(() => {
          this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
          void this.open().catch(() => {});
        }, this.backoff);
      };
    });
  }

  async send(line: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(line.endsWith("\n") ? line : line + "\n");
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.ws?.close();
    this.ws = undefined;
    this.setState("disconnected");
  }
}
