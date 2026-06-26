/**
 * Room-level end-to-end encryption.
 *
 * Every wire line (position, chat, marker, media, WebRTC signaling) is sealed
 * with AES-256-GCM before it reaches the relay and opened again on receipt. The
 * relay only ever sees opaque ciphertext — it forwards bytes it cannot read.
 *
 * The key is derived from a shared passphrase via PBKDF2, salted with the room
 * code. The passphrase is the secret: it is exchanged out-of-band between
 * teammates and NEVER sent to the relay (the relay only sees `?room=<code>`).
 * Two units decrypt each other's traffic iff they share both room + passphrase.
 *
 * Backward/sideways compatible: a unit with no passphrase set sends cleartext
 * lines (legacy behaviour) and `open` passes through any line that isn't a
 * sealed envelope, so encrypted and plaintext nets degrade predictably.
 */

const PBKDF2_ITERATIONS = 150_000;
const NONCE_BYTES = 12; // AES-GCM standard nonce length

interface Envelope {
  v: 1; // envelope version
  n: string; // base64 nonce
  c: string; // base64 ciphertext + GCM tag
}

function isEnvelope(o: unknown): o is Envelope {
  return (
    typeof o === "object" &&
    o != null &&
    (o as Envelope).v === 1 &&
    typeof (o as Envelope).n === "string" &&
    typeof (o as Envelope).c === "string"
  );
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class RoomCipher {
  private key?: CryptoKey;
  private enc = new TextEncoder();
  private dec = new TextDecoder();

  /** True when a passphrase has been set and outbound lines will be sealed. */
  enabled(): boolean {
    return this.key != null;
  }

  /**
   * Derive (or clear) the room key. An empty passphrase clears the key, dropping
   * the net back to cleartext. Re-deriving on room/passphrase change is cheap
   * relative to per-message ops, so callers can call this freely on connect.
   */
  async setSecret(passphrase: string, room: string): Promise<void> {
    const pass = passphrase.trim();
    if (!pass) {
      this.key = undefined;
      return;
    }
    if (typeof crypto === "undefined" || !crypto.subtle) {
      // No WebCrypto (insecure context): fail closed rather than leak cleartext
      // when the operator explicitly asked for encryption.
      throw new Error("WebCrypto no disponible (requiere HTTPS)");
    }
    const base = await crypto.subtle.importKey(
      "raw",
      this.enc.encode(pass),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    this.key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: this.enc.encode(`irma:${room}`),
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  /** Seal one wire line. Returns the line unchanged when no key is set. */
  async seal(line: string): Promise<string> {
    if (!this.key) return line;
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      this.key,
      this.enc.encode(line),
    );
    const env: Envelope = {
      v: 1,
      n: bytesToB64(nonce),
      c: bytesToB64(new Uint8Array(cipher)),
    };
    return JSON.stringify(env);
  }

  /**
   * Open one inbound line.
   *  - Sealed envelope + key present -> plaintext, or null if it fails to
   *    decrypt (wrong passphrase / tampered / different room).
   *  - Sealed envelope + no key -> null (encrypted net, we can't read it).
   *  - Anything else (cleartext packet) -> returned verbatim.
   */
  async open(line: string): Promise<string | null> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return line; // not JSON — let the packet decoder reject it
    }
    if (!isEnvelope(parsed)) return line; // plaintext packet, pass through
    if (!this.key) return null;
    try {
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBytes(parsed.n) as BufferSource },
        this.key,
        b64ToBytes(parsed.c) as BufferSource,
      );
      return this.dec.decode(plain);
    } catch {
      return null; // wrong key or tampered frame
    }
  }
}
