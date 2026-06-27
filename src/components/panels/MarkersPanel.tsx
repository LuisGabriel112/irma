"use client";

import { useState } from "react";
import { Hexagon, MapPin, Pencil, Shapes, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { Dot, EmptyState, Button } from "@/components/ui";
import { AFFILIATION_LABELS } from "@/lib/types";
import { formatGrid } from "@/lib/geo/utils";
import { applyAffiliation, renderSymbol, SYMBOL_PALETTE } from "@/lib/symbols";
import { cn } from "@/lib/util/cn";

export function MarkersPanel() {
  const markers = useStore((s) => s.markers);
  const removeMarker = useStore((s) => s.removeMarker);
  const toggleGeofence = useStore((s) => s.toggleGeofence);
  const setMarkerSymbol = useStore((s) => s.setMarkerSymbol);
  const editMarker = useStore((s) => s.editMarker);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const setFollowSelf = useStore((s) => s.setFollowSelf);
  const setTool = useStore((s) => s.setTool);
  const [picker, setPicker] = useState<string | null>(null); // marker id whose symbol picker is open
  const [editing, setEditing] = useState<string | null>(null); // marker id being annotated

  const list = Object.values(markers).sort((a, b) => b.createdAt - a.createdAt);
  const pickerMarker = picker ? markers[picker] : null;
  const editMarkerObj = editing ? markers[editing] : null;

  return (
    <div className="flex flex-col">
      {list.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-5 w-5" />}
          title="Sin gráficos"
          action={{
            label: "Armar marcador aliado",
            icon: <MapPin className="h-4 w-4" />,
            onClick: () => setTool("marker-friend"),
          }}
        >
          Marca aliados, hostiles o puntos de ruta y se difunden a toda la red.
          Arma una herramienta, luego toca el mapa para colocar.
        </EmptyState>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] text-tac-muted">{list.length} gráfico(s)</span>
            <Button
              variant="ghost"
              className="px-2 py-1 text-[10px]"
              onClick={() => list.forEach((m) => removeMarker(m.id))}
            >
              Borrar todo
            </Button>
          </div>
          {list.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 border-t border-tac-line/60 px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => {
                  setFollowSelf(false);
                  requestFlyTo(m.id);
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <Dot affiliation={m.affiliation} color={m.color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-semibold text-tac-text">
                    {m.label ?? "Marcador"}
                  </div>
                  <div className="text-[11px] tabular-nums text-tac-muted">
                    {m.geofence && <span className="text-tac-warn">⬡ GEOCERCA · </span>}
                    {AFFILIATION_LABELS[m.affiliation]} · {formatGrid(m.coords[0].lat, m.coords[0].lng)}
                  </div>
                  {m.remark && <div className="truncate text-[11px] text-tac-muted">“{m.remark}”</div>}
                </div>
              </button>
              {m.type === "point" && (
                <button
                  type="button"
                  onClick={() => setPicker(m.id)}
                  title="Símbolo militar (MIL-STD-2525)"
                  aria-label="Cambiar símbolo militar"
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent",
                    m.symbol ? "text-tac-accent" : "text-tac-muted hover:text-tac-text",
                  )}
                >
                  <Shapes className="h-4 w-4" />
                </button>
              )}
              {(m.type === "polygon" || m.type === "circle") && (
                <button
                  type="button"
                  onClick={() => toggleGeofence(m.id)}
                  aria-pressed={!!m.geofence}
                  title={m.geofence ? "Quitar geocerca" : "Marcar como geocerca"}
                  aria-label={m.geofence ? "Quitar geocerca" : "Marcar como geocerca"}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent",
                    m.geofence ? "text-tac-warn" : "text-tac-muted hover:text-tac-text",
                  )}
                >
                  <Hexagon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(m.id)}
                title="Nombre / observación"
                aria-label="Editar nombre del marcador"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] text-tac-muted hover:text-tac-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-accent"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeMarker(m.id)}
                aria-label="Eliminar marcador"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-tac)] text-tac-muted hover:bg-tac-danger/15 hover:text-tac-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tac-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </>
      )}

      {pickerMarker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPicker(null)}
        >
          <div
            className="w-full max-w-xs rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.14em] text-tac-muted">
                Símbolo · {pickerMarker.label ?? "Marcador"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMarkerSymbol(pickerMarker.id, undefined);
                  setPicker(null);
                }}
                className="text-[11px] text-tac-muted underline-offset-2 hover:text-tac-text hover:underline"
              >
                Quitar
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SYMBOL_PALETTE.map((def) => {
                const sym = renderSymbol(applyAffiliation(def.sidc, pickerMarker.affiliation), 30);
                const active = pickerMarker.symbol === def.sidc;
                return (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => {
                      setMarkerSymbol(pickerMarker.id, def.sidc);
                      setPicker(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[var(--radius-tac)] border px-1 py-2 transition-colors",
                      active ? "border-tac-accent bg-tac-accent/10" : "border-tac-line hover:border-tac-muted",
                    )}
                  >
                    <span
                      className="flex h-9 items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: sym.svg }}
                    />
                    <span className="text-center text-[9px] leading-tight text-tac-muted">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {editMarkerObj && (
        <EditMarkerModal
          key={editMarkerObj.id}
          id={editMarkerObj.id}
          initialLabel={editMarkerObj.label ?? ""}
          initialRemark={editMarkerObj.remark ?? ""}
          onSave={(label, remark) => {
            editMarker(editMarkerObj.id, { label, remark });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EditMarkerModal({
  id,
  initialLabel,
  initialRemark,
  onSave,
  onClose,
}: {
  id: string;
  initialLabel: string;
  initialRemark: string;
  onSave: (label: string, remark: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [remark, setRemark] = useState(initialRemark);
  void id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-tac-muted">Nombre y observación</div>
        <label className="mb-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-tac-muted">Nombre / etiqueta</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
            autoFocus
            placeholder="ej. PC ALFA, Sector 2"
            className="rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1.5 text-sm text-tac-text focus:border-tac-accent focus:outline-none"
          />
        </label>
        <label className="mb-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-tac-muted">Observación</span>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            maxLength={140}
            rows={2}
            placeholder="Detalle opcional"
            className="resize-none rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg px-2 py-1.5 text-sm text-tac-text focus:border-tac-accent focus:outline-none"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" className="px-3 py-1.5 text-xs" onClick={() => onSave(label, remark)}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}
