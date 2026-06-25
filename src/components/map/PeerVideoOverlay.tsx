"use client";

import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { X } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { AFFILIATION_COLORS } from "@/lib/types";

const THUMB_W = 132;
const THUMB_H = 99;
const Y_OFFSET = 18; // gap above the marker dot

/**
 * Live-video thumbnails anchored over watched peers' markers. Rendered as DOM
 * <video> elements positioned with map.latLngToContainerPoint (not Leaflet
 * markers) so the element — and its bound MediaStream — survives marker re-renders;
 * recreating the <video> would tear down the stream.
 */
export function PeerVideoOverlay({ map }: { map: L.Map }) {
  const peers = useStore((s) => s.peers);
  const remoteStreams = useStore((s) => s.remoteStreams);
  const watching = useStore((s) => s.watching);
  const unwatchPeer = useStore((s) => s.unwatchPeer);
  const [, tick] = useState(0);

  // Reposition on any map movement.
  useEffect(() => {
    const rerender = () => tick((n) => n + 1);
    map.on("move zoom zoomanim resize viewreset", rerender);
    return () => {
      map.off("move zoom zoomanim resize viewreset", rerender);
    };
  }, [map]);

  const live = watching.filter((id) => remoteStreams[id] && peers[id]);
  if (live.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {live.map((id) => {
        const peer = peers[id];
        const pt = map.latLngToContainerPoint([peer.lat, peer.lng]);
        const color = AFFILIATION_COLORS[peer.affiliation];
        return (
          <div
            key={id}
            className="pointer-events-auto absolute"
            style={{
              left: pt.x - THUMB_W / 2,
              top: pt.y - THUMB_H - Y_OFFSET,
              width: THUMB_W,
            }}
          >
            <div
              className="overflow-hidden rounded-md border bg-black/80 shadow-lg"
              style={{ borderColor: color }}
            >
              <div
                className="flex items-center justify-between px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                style={{ color }}
              >
                <span className="truncate">{peer.callsign}</span>
                <button
                  type="button"
                  onClick={() => unwatchPeer(id)}
                  title="Cerrar video"
                  aria-label="Cerrar video"
                  className="ml-1 shrink-0 text-tac-muted hover:text-tac-text"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Stream stream={remoteStreams[id]} />
            </div>
            {/* little pointer down to the marker */}
            <div
              className="mx-auto h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent"
              style={{ borderTopColor: color }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Stream({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      width={THUMB_W}
      height={THUMB_H - 16}
      className="block h-[83px] w-full bg-black object-cover"
    />
  );
}
