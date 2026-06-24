import { BaseTransport } from "@/lib/transport/base";
import type { TransportKind } from "@/lib/transport/types";

// Nordic UART Service (NUS) — the de-facto "serial over BLE" profile exposed by
// most LoRa boards and Meshtastic-class devices.
const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write: app -> device
const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify: device -> app

const BLE_CHUNK = 20; // conservative ATT payload

/** LoRa over Bluetooth LE using the Nordic UART Service. */
export class BluetoothTransport extends BaseTransport {
  readonly kind: TransportKind = "bluetooth";
  private device?: BluetoothDevice;
  private rx?: BluetoothRemoteGATTCharacteristic;
  private decoder = new TextDecoder();
  private onDisconnect = () => {
    this.log("BLE device disconnected");
    this.setState("disconnected");
  };

  async connect(): Promise<void> {
    if (!("bluetooth" in navigator)) {
      throw new Error(
        "Web Bluetooth unavailable — use Chrome/Edge over HTTPS or localhost.",
      );
    }
    this.setState("connecting");
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NUS_SERVICE] }],
        optionalServices: [NUS_SERVICE],
      });
      this.device.addEventListener("gattserverdisconnected", this.onDisconnect);
      const server = await this.device.gatt!.connect();
      const service = await server.getPrimaryService(NUS_SERVICE);
      this.rx = await service.getCharacteristic(NUS_RX);
      const tx = await service.getCharacteristic(NUS_TX);
      await tx.startNotifications();
      tx.addEventListener("characteristicvaluechanged", (ev) => {
        const v = (ev.target as BluetoothRemoteGATTCharacteristic).value;
        if (v) this.ingest(this.decoder.decode(v, { stream: true }));
      });
      this.setState("connected", this.device.name ?? "BLE device");
      this.log(`BLE connected: ${this.device.name ?? "unnamed"}`);
    } catch (e) {
      this.setState("error", (e as Error).message);
      throw e;
    }
  }

  async send(line: string): Promise<void> {
    if (!this.rx) throw new Error("bluetooth not connected");
    const bytes = new TextEncoder().encode(`${line}\n`);
    for (let i = 0; i < bytes.length; i += BLE_CHUNK) {
      await this.rx.writeValueWithoutResponse(bytes.slice(i, i + BLE_CHUNK));
    }
  }

  async disconnect(): Promise<void> {
    this.device?.removeEventListener("gattserverdisconnected", this.onDisconnect);
    try {
      this.device?.gatt?.disconnect();
    } catch {
      /* already gone */
    }
    this.device = undefined;
    this.rx = undefined;
    this.setState("disconnected");
  }
}
