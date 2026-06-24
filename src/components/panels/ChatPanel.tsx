"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, MessageSquare, Send, Square, X } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { cn } from "@/lib/util/cn";
import { EmptyState } from "@/components/ui";
import { blobToDataUrl, compressImage, pickAudioMime } from "@/lib/util/media";
import type { ChatMessage } from "@/lib/types";

const MAX_CLIP_MS = 20_000;

function MessageBubble({ m, onOpenImage }: { m: ChatMessage; onOpenImage: (src: string) => void }) {
  return (
    <div className={cn("flex flex-col", m.self ? "items-end" : "items-start")}>
      {!m.self && (
        <span className="mb-0.5 px-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-tac-friend">
          {m.from}
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] overflow-hidden rounded-[var(--radius-tac)] text-sm",
          m.media ? "p-1" : "px-3 py-1.5",
          m.self ? "bg-tac-accent/15 text-tac-text" : "border border-tac-line bg-tac-panel-2 text-tac-text",
        )}
      >
        {m.media?.kind === "image" && (
          <button
            type="button"
            onClick={() => onOpenImage(m.media!.data)}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent"
          >
            {/* data-URL thumbnail; tap to view full */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.media.data}
              alt="Adjunto"
              className="max-h-52 w-full rounded-[6px] object-cover"
            />
          </button>
        )}
        {m.media?.kind === "audio" && (
          <audio controls src={m.media.data} className="h-9 w-56 max-w-full" />
        )}
        {m.text && <div className={cn(m.media ? "px-2 py-1" : "")}>{m.text}</div>}
      </div>
      <span className="mt-0.5 px-1 text-[10px] tabular-nums text-tac-muted">
        {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
      </span>
    </div>
  );
}

export function ChatPanel() {
  const messages = useStore((s) => s.messages);
  const sendMessage = useStore((s) => s.sendMessage);
  const sendMedia = useStore((s) => s.sendMedia);
  const markRead = useStore((s) => s.markRead);
  const onRelay = useStore((s) => s.connection.kind === "websocket" && s.connection.state === "connected");

  const [draft, setDraft] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    markRead();
  }, [markRead, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      const { dataUrl } = await compressImage(file);
      sendMedia({ kind: "image", dataUrl });
    } catch {
      window.alert("No se pudo procesar la imagen.");
    }
  };

  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      window.alert("Grabación de audio no soportada en este navegador.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      window.alert("No se pudo acceder al micrófono. Revisa los permisos.");
      return;
    }
    try {
      // iOS Safari rejects webm; some builds throw even when isTypeSupported is
      // true. Try the best mime, then fall back to the browser default.
      const mime = pickAudioMime();
      let rec: MediaRecorder;
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        rec = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        // Use the recorder's real mime (e.g. audio/mp4 on iOS) so playback works.
        const type = rec.mimeType || chunksRef.current[0]?.type || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type });
        const dur = (Date.now() - startedRef.current) / 1000;
        if (dur >= 0.4 && blob.size > 0) {
          const dataUrl = await blobToDataUrl(blob);
          sendMedia({ kind: "audio", dataUrl, dur });
        }
      };
      recorderRef.current = rec;
      startedRef.current = Date.now();
      rec.start();
      setRecording(true);
      setElapsed(0);
      autoStopRef.current = setTimeout(stopRecording, MAX_CLIP_MS);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      window.alert("No se pudo iniciar la grabación en este dispositivo.");
    }
  };

  const stopRecording = () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = null;
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  // Tick the elapsed counter while recording.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((Date.now() - startedRef.current) / 1000), 200);
    return () => clearInterval(t);
  }, [recording]);

  // Cleanup any in-flight recording on unmount.
  useEffect(() => () => stopRecording(), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="Sin tráfico">
            Los mensajes se difunden a todas las unidades de la red. Escribe abajo
            para emitir el primero. Imágenes y audios requieren enlace por relay.
          </EmptyState>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} m={m} onOpenImage={setLightbox} />)
        )}
      </div>

      {!onRelay && (
        <div className="border-t border-tac-line/60 bg-tac-warn/10 px-3 py-1.5 text-[11px] leading-snug text-tac-warn">
          Imágenes y audios se envían solo por enlace de relay (internet). Conéctalo en Enlace.
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-2 border-t border-tac-line p-2">
          <span className="flex h-11 flex-1 items-center gap-2 rounded-[var(--radius-tac)] border border-tac-danger/50 bg-tac-danger/10 px-3 text-sm text-tac-danger">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-tac-danger" />
            <span className="tabular-nums">Grabando… {elapsed.toFixed(1)}s</span>
          </span>
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Detener y enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] bg-tac-accent text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-text"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-tac-line p-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Adjuntar imagen"
            title="Adjuntar imagen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] border border-tac-line text-tac-muted hover:text-tac-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={startRecording}
            aria-label="Grabar audio"
            title="Grabar audio"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] border border-tac-line text-tac-muted hover:text-tac-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent"
          >
            <Mic className="h-4 w-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Mensaje a todas las unidades…"
            className="min-w-0 flex-1 rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-3 py-2 text-sm text-tac-text placeholder:text-tac-muted focus:border-tac-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] bg-tac-accent text-black transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-text disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Adjunto" className="max-h-full max-w-full rounded-[var(--radius-tac)]" />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-tac-panel/90 text-tac-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
