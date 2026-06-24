"use client";

import {
  Circle,
  Crosshair,
  Hand,
  Hexagon,
  LocateFixed,
  MapPin,
  Ruler,
  Shield,
  Siren,
  Skull,
  Spline,
  Square,
} from "lucide-react";
import { useStore, type Tool } from "@/lib/store/useStore";
import { IconButton } from "@/components/ui";
import { AFFILIATION_COLORS } from "@/lib/types";

// Measure tool isn't an affiliation; it carries the caution/range color (--color-tac-warn).
const MEASURE_COLOR = AFFILIATION_COLORS.unknown;
const DRAW_COLOR = "#7dd3fc";

const TOOLS: Array<{ tool: Tool; label: string; icon: React.ReactNode; color?: string }> = [
  { tool: "pan", label: "Mover / seleccionar", icon: <Hand className="h-5 w-5" /> },
  { tool: "marker-friend", label: "Marcar aliado", icon: <Shield className="h-5 w-5" />, color: AFFILIATION_COLORS.friend },
  { tool: "marker-hostile", label: "Marcar hostil", icon: <Skull className="h-5 w-5" />, color: AFFILIATION_COLORS.hostile },
  { tool: "marker-neutral", label: "Marcar neutral", icon: <Square className="h-5 w-5" />, color: AFFILIATION_COLORS.neutral },
  { tool: "marker-point", label: "Punto de ruta", icon: <MapPin className="h-5 w-5" />, color: AFFILIATION_COLORS.self },
  { tool: "draw-line", label: "Dibujar línea", icon: <Spline className="h-5 w-5" />, color: DRAW_COLOR },
  { tool: "draw-polygon", label: "Dibujar polígono", icon: <Hexagon className="h-5 w-5" />, color: DRAW_COLOR },
  { tool: "draw-circle", label: "Dibujar círculo", icon: <Circle className="h-5 w-5" />, color: DRAW_COLOR },
  { tool: "measure", label: "Medir distancia", icon: <Ruler className="h-5 w-5" />, color: MEASURE_COLOR },
];

export function ToolDock() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const setFollowSelf = useStore((s) => s.setFollowSelf);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const raiseAlert = useStore((s) => s.raiseAlert);
  const hasFix = useStore((s) => s.self.lat != null && s.self.lng != null);
  const selfId = useStore((s) => s.self.id);

  const recenter = () => {
    setFollowSelf(true);
    requestFlyTo(selfId);
  };

  const panic = () => {
    if (!hasFix) {
      window.alert("Sin posición GPS: no se puede emitir alerta. Fija tu posición primero.");
      return;
    }
    if (window.confirm("¿Emitir alerta de PÁNICO a toda la sala? Se transmitirá tu posición.")) {
      raiseAlert("panic");
    }
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
      <div className="my-0.5 h-px bg-tac-line" />
      <IconButton
        title="Emitir alerta de pánico"
        aria-label="Emitir alerta de pánico"
        onClick={panic}
        className="border-tac-danger/50 text-tac-danger hover:border-tac-danger hover:text-tac-danger"
      >
        <Siren className="h-5 w-5" />
      </IconButton>
    </div>
  );
}
