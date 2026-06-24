"use client";

import {
  Crosshair,
  Hand,
  LocateFixed,
  MapPin,
  Ruler,
  Shield,
  Skull,
  Square,
} from "lucide-react";
import { useStore, type Tool } from "@/lib/store/useStore";
import { IconButton } from "@/components/ui";
import { AFFILIATION_COLORS } from "@/lib/types";

// Measure tool isn't an affiliation; it carries the caution/range color (--color-tac-warn).
const MEASURE_COLOR = AFFILIATION_COLORS.unknown;

const TOOLS: Array<{ tool: Tool; label: string; icon: React.ReactNode; color?: string }> = [
  { tool: "pan", label: "Mover / seleccionar", icon: <Hand className="h-5 w-5" /> },
  { tool: "marker-friend", label: "Marcar aliado", icon: <Shield className="h-5 w-5" />, color: AFFILIATION_COLORS.friend },
  { tool: "marker-hostile", label: "Marcar hostil", icon: <Skull className="h-5 w-5" />, color: AFFILIATION_COLORS.hostile },
  { tool: "marker-neutral", label: "Marcar neutral", icon: <Square className="h-5 w-5" />, color: AFFILIATION_COLORS.neutral },
  { tool: "marker-point", label: "Punto de ruta", icon: <MapPin className="h-5 w-5" />, color: AFFILIATION_COLORS.self },
  { tool: "measure", label: "Medir distancia", icon: <Ruler className="h-5 w-5" />, color: MEASURE_COLOR },
];

export function ToolDock() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const setFollowSelf = useStore((s) => s.setFollowSelf);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const selfId = useStore((s) => s.self.id);

  const recenter = () => {
    setFollowSelf(true);
    requestFlyTo(selfId);
  };

  return (
    <div className="pointer-events-auto absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5 rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel/85 p-1.5 backdrop-blur-md">
      {TOOLS.map((t) => (
        <IconButton
          key={t.tool}
          active={tool === t.tool}
          title={t.label}
          aria-label={t.label}
          onClick={() => setTool(tool === t.tool && t.tool !== "pan" ? "pan" : t.tool)}
          style={tool === t.tool && t.color ? { color: t.color, borderColor: t.color } : undefined}
        >
          {t.icon}
        </IconButton>
      ))}
      <div className="my-0.5 h-px bg-tac-line" />
      <IconButton
        active={tool === "set-self"}
        title="Fijar mi posición (toca el mapa)"
        aria-label="Fijar mi posición"
        onClick={() => setTool(tool === "set-self" ? "pan" : "set-self")}
        style={tool === "set-self" ? { color: "#3ddc84", borderColor: "#3ddc84" } : undefined}
      >
        <Crosshair className="h-5 w-5" />
      </IconButton>
      <IconButton title="Centrar en mí" aria-label="Centrar en mí" onClick={recenter}>
        <LocateFixed className="h-5 w-5" />
      </IconButton>
    </div>
  );
}
