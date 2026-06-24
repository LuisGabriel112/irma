import { BaseTransport } from "@/lib/transport/base";
import type { ConnectOptions, TransportKind } from "@/lib/transport/types";

/**
 * LoRa over USB serial via the Web Serial API.
 *
 * Pair with any LoRa dev board (Heltec/TTGO/RAK, Meshtastic, etc.) running a
 * serial<->LoRa bridge that forwards newline-delimited frames to/from the radio.
 * See README "LoRa hardware bridge".
 */
export class SerialTransport extends BaseTransport {
  readonly kind: TransportKind = "serial";
  private port?: SerialPort;
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private writer?: WritableStreamDefaultWriter<Uint8Array>;
  private keepReading = false;
  private baud: number;

  constructor(cb: ConstructorParameters<typeof BaseTransport>[0], baud = 115200) {
    super(cb);
    this.baud = baud;
  }

  async connect(opts?: ConnectOptions): Promise<void> {
    if (!("serial" in navigator)) {
      throw new Error(
        "Web Serial unavailable — use Chrome/Edge over HTTPS or localhost.",
      );
    }
    if (opts?.baudRate) this.baud = opts.baudRate;
    this.setState("connecting");
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baud });
      this.writer = this.port.writable?.getWriter();
      this.keepReading = true;
      void this.readLoop();
      this.setState("connected", `serial @ ${this.baud} baud`);
      this.log(`Serial port opened @ ${this.baud} baud`);
    } catch (e) {
      this.setState("error", (e as Error).message);
      throw e;
    }
  }

  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder();
    while (this.port?.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) this.ingest(decoder.decode(value, { stream: true }));
        }
      } catch (e) {
        this.log(`read error: ${(e as Error).message}`);
      } finally {
        this.reader.releaseLock();
      }
    }
  }

  async send(line: string): Promise<void> {
    if (!this.writer) throw new Error("serial not connected");
    await this.writer.write(new TextEncoder().encode(`${line}\n`));
  }

  async disconnect(): Promise<void> {
    this.keepReading = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* already released */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      await this.port?.close();
    } catch {
      /* already closed */
    }
    this.port = undefined;
    this.setState("disconnected");
  }
}
