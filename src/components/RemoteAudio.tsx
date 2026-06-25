"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store/useStore";

/**
 * Plays inbound peer voice. One hidden <audio> per peer stream; not muted (unlike
 * the video thumbnails) so push-to-talk is actually heard. Kept out of the map
 * layer so audio survives marker re-renders.
 */
export function RemoteAudio() {
  const remoteAudio = useStore((s) => s.remoteAudio);
  return (
    <>
      {Object.entries(remoteAudio).map(([id, stream]) => (
        <AudioSink key={id} stream={stream} />
      ))}
    </>
  );
}

function AudioSink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay className="hidden" />;
}
