"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronUp,
  Circle,
  Crosshair,
  Hand,
  Hexagon,
  LocateFixed,
  MapPin,
  PencilLine,
  Ruler,
  Shield,
  Siren,
  Skull,
  Spline,
  Square,
} from "lucide-react";
import { useStore, type Tool } from "@/lib/store/useStore";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/util/cn";
import { AFFILIATION_COLORS } from "@/lib/types";

const MEASURE_COLOR = AFFILIATION_COLORS.unknown;
const DRAW_COLOR = "#7dd3fc";

type Item = { tool: Tool; label: string; icon: React.ReactNode; color?: string };

// Markers and draw shapes collapse into two expandable groups so the dock stays
// compact (7 top-level controls) instead of 13 crammed in a row on a phone.
const MARKER_ITEMS: Item[] = [
  { tool: "marker-friend", label: "Aliado", icon: <Shield className="h-5 w-5" />, color: AFFILIATION_COLORS.friend },
  { tool: "marker-hostile", label: "Hostil", icon: <Skull className="h-5 w-5" />, color: AFFILIATION_COLORS.hostile },
  { tool: "marker-neutral", label: "Neutral", icon: <Square className="h-5 w-5" />, color: AFFILIATION_COLORS.neutral },
  { tool: "marker-point", label: "Punto de ruta", icon: <MapPin className="h-5 w-5" />, color: AFFILIATION_COLORS.self },
];
const DRAW_ITEMS: Item[] = [
  { tool: "draw-line", label: "Línea", icon: <Spline className="h-5 w-5" />, color: DRAW_COLOR },
  { tool: "draw-polygon", label: "Polígono", icon: <Hexagon className="h-5 w-5" />, color: DRAW_COLOR },
  { tool: "draw-circle", label: "Círculo", icon: <Circle className="h-5 w-5" />, color: DRAW_COLOR },
];

function Group({
  items,
  fallbackIcon,
  label,
  open,
  onToggle,
}: {
  items: Item[];
  fallbackIcon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const active = items.find((i) => i.tool === tool);

  return (
    <div className="relative shrink-0">
      <IconButton
        active={!!active}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={onToggle}
        className="relative shrink-0"
        style={active?.color ? { color: active.color, borderColor: active.color } : undefined}
      >
        {active ? active.icon : fallbackIcon}
        {/* caret: a group expands into options */}
        <ChevronUp
          className={cn(
            "absolute right-0.5 top-0.5 h-3 w-3 text-tac-muted transition-transform lg:bottom-0.5 lg:right-0.5 lg:top-auto",
            open && "rotate-180 text-tac-text",
          )}
        />
      </IconButton>

      {open && (
        <div
          className={cn(
            "absolute z-30 flex gap-1.5 rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel/95 p-1.5 backdrop-blur-md",
            // phone: pop up above the group; desktop: fly out to the right
            "bottom-full left-1/2 mb-2 -translate-x-1/2 flex-row",
            "lg:bottom-auto lg:left-full lg:top-1/2 lg:mb-0 lg:ml-2 lg:-translate-x-0 lg:-translate-y-1/2 lg:flex-col",
          )}
        >
          {items.map((it) => (
            <IconButton
              key={it.tool}
              className="shrink-0"
              active={tool === it.tool}
              title={it.label}
              aria-label={it.label}
              onClick={() => setTool(tool === it.tool ? "pan" : it.tool)}
              style={tool === it.tool && it.color ? { color: it.color, borderColor: it.color } : undefined}
            >
              {it.icon}
            </IconButton>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToolDock() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const setFollowSelf = useStore((s) => s.setFollowSelf);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const raiseAlert = useStore((s) => s.raiseAlert);
  const hasFix = useStore((s) => s.self.lat != null && s.self.lng != null);
  const selfId = useStore((s) => s.self.id);

  const [expanded, setExpanded] = useState<"markers" | "draw" | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Close an open group when tapping anywhere outside the dock.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: PointerEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setExpanded(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [expanded]);

  // Collapse the group once a tool from it is chosen.
  useEffect(() => {
    setExpanded(null);
  }, [tool]);

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

  const toggle = (id: "markers" | "draw") => setExpanded((cur) => (cur === id ? null : id));

  return (
    <div
      ref={dockRef}
      className={cn(
        // No overflow here on purpose: a scroll container would clip the group
        // flyouts that pop above the dock. Grouping keeps it to 7 controls, which
        // fit the narrowest phones (~354px) without scrolling.
        "pointer-events-auto absolute left-1/2 z-20 flex -translate-x-1/2 flex-row items-center gap-1 rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel/85 p-1.5 backdrop-blur-md",
        "lg:left-3 lg:top-1/2 lg:-translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:gap-1.5",
      )}
      style={{ bottom: "calc(0.5rem + var(--safe-bottom))" }}
    >
      <IconButton
        className="shrink-0"
        active={tool === "pan"}
        title="Mover / seleccionar"
        aria-label="Mover / seleccionar"
        onClick={() => setTool("pan")}
      >
        <Hand className="h-5 w-5" />
      </IconButton>

      <Group
        items={MARKER_ITEMS}
        fallbackIcon={<MapPin className="h-5 w-5" />}
        label="Marcadores"
        open={expanded === "markers"}
        onToggle={() => toggle("markers")}
      />
      <Group
        items={DRAW_ITEMS}
        fallbackIcon={<PencilLine className="h-5 w-5" />}
        label="Dibujar"
        open={expanded === "draw"}
        onToggle={() => toggle("draw")}
      />

      <IconButton
        className="shrink-0"
        active={tool === "measure"}
        title="Medir distancia"
        aria-label="Medir distancia"
        onClick={() => setTool(tool === "measure" ? "pan" : "measure")}
        style={tool === "measure" ? { color: MEASURE_COLOR, borderColor: MEASURE_COLOR } : undefined}
      >
        <Ruler className="h-5 w-5" />
      </IconButton>

      <div className="mx-0.5 w-px shrink-0 self-stretch bg-tac-line lg:mx-0 lg:my-0.5 lg:h-px lg:w-full lg:self-auto" />

      <IconButton
        className="shrink-0"
        active={tool === "set-self"}
        title="Fijar mi posición (toca el mapa)"
        aria-label="Fijar mi posición"
        onClick={() => setTool(tool === "set-self" ? "pan" : "set-self")}
        style={tool === "set-self" ? { color: "#3ddc84", borderColor: "#3ddc84" } : undefined}
      >
        <Crosshair className="h-5 w-5" />
      </IconButton>
      <IconButton
        className="shrink-0"
        title="Centrar en mí"
        aria-label="Centrar en mí"
        onClick={recenter}
      >
        <LocateFixed className="h-5 w-5" />
      </IconButton>

      <div className="mx-0.5 w-px shrink-0 self-stretch bg-tac-line lg:mx-0 lg:my-0.5 lg:h-px lg:w-full lg:self-auto" />

      <IconButton
        className="shrink-0 border-tac-danger/50 text-tac-danger hover:border-tac-danger hover:text-tac-danger"
        title="Emitir alerta de pánico"
        aria-label="Emitir alerta de pánico"
        onClick={panic}
      >
        <Siren className="h-5 w-5" />
      </IconButton>
    </div>
  );
}
