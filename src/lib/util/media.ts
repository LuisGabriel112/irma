// Capture + compress chat attachments. Everything here is relay-only: the
// outputs are far larger than a LoRa frame, so callers must gate on the
// WebSocket transport. Targets keep a frame comfortably under the relay's 1 MB
// limit (base64 inflates bytes ~33%).

const IMAGE_MAX_DIM = 1024; // px, longest side
const IMAGE_QUALITY = 0.55;

export interface CapturedMedia {
  dataUrl: string; // `data:<mime>;base64,<...>`
  mime: string;
  dur?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo decodificar la imagen"));
    img.src = src;
  });
}

/**
 * Downscale + re-encode an image file to a compact JPEG data URL. Uses an
 * <img> element (not createImageBitmap, which is flaky/absent on iOS WebKit);
 * iOS converts HEIC camera photos to JPEG at the file-input boundary, so the
 * element loads them fine.
 */
export async function compressImage(file: File): Promise<CapturedMedia> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/jpeg", IMAGE_QUALITY), mime: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Pick the best supported MediaRecorder mime for a short voice clip. */
export function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Split a data URL into its mime + raw base64 payload for wire transmission. */
export function splitDataUrl(dataUrl: string): { mime: string; base64: string } {
  const comma = dataUrl.indexOf(",");
  const head = dataUrl.slice(5, comma); // strip "data:"
  const mime = head.split(";")[0] || "application/octet-stream";
  return { mime, base64: dataUrl.slice(comma + 1) };
}

export const buildDataUrl = (mime: string, base64: string) => `data:${mime};base64,${base64}`;

/** Approximate byte size of a base64 string. */
export const base64Bytes = (b64: string) => Math.floor((b64.length * 3) / 4);
