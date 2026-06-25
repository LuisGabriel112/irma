"use client";

import { Mic } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { cn } from "@/lib/util/cn";

/**
 * Push-to-talk button. Hold to open the mic to the mesh, release to mute. Only
 * shown on a connected relay link (voice rides the WebRTC mesh, like video).
 */
export function VoicePtt() {
  const wsLink = useStore(
    (s) => s.connection.kind === "websocket" && s.connection.state === "connected",
  );
  const talking = useStore((s) => s.talking);
  const setTalking = useStore((s) => s.setTalking);

  if (!wsLink) return null;

  const press = () => void setTalking(true);
  const release = () => void setTalking(false);

  return (
    <button
      type="button"
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={() => talking && release()}
      onPointerCancel={release}
      aria-label="Mantén para hablar"
      title="Mantén para hablar"
      className={cn(
        "pointer-events-auto absolute z-20 flex select-none touch-none items-center justify-center rounded-full border shadow-lg transition-colors",
        "h-14 w-14",
        talking
          ? "border-tac-danger bg-tac-danger/90 text-white"
          : "border-tac-line bg-tac-panel/90 text-tac-text hover:border-tac-accent",
      )}
      style={{
        right: "max(1rem, var(--safe-right))",
        bottom: "calc(var(--dock-h, 4rem) + max(1rem, var(--safe-bottom)) + 0.5rem)",
      }}
    >
      <Mic className="h-6 w-6" />
      {talking && (
        <span className="absolute -top-7 whitespace-nowrap rounded bg-tac-danger px-2 py-0.5 text-[10px] font-bold text-white">
          AL AIRE
        </span>
      )}
    </button>
  );
}
