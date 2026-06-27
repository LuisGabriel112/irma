"use client";

import { useState } from "react";
import { Cross, X } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { Button } from "@/components/ui";
import { formatGrid } from "@/lib/geo/utils";
import { CASEVAC_SECURITY_LABELS, type CasevacSecurity } from "@/lib/types";

const FIELD =
  "rounded-[var(--radius-tac)] border border-tac-line bg-tac-panel px-2 py-1.5 text-sm text-tac-text focus:border-tac-accent focus:outline-none";
const LABEL = "text-[10px] uppercase tracking-[0.12em] text-tac-muted";

const num = (s: string): number | undefined => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** 9-line MEDEVAC/CASEVAC request form. Pickup defaults to own position. */
export function CasevacForm({ onClose }: { onClose: () => void }) {
  const self = useStore((s) => s.self);
  const sendCasevac = useStore((s) => s.sendCasevac);

  const [freq, setFreq] = useState("");
  const [urgent, setUrgent] = useState("");
  const [priority, setPriority] = useState("");
  const [routine, setRoutine] = useState("");
  const [equipment, setEquipment] = useState("");
  const [litter, setLitter] = useState("");
  const [ambulatory, setAmbulatory] = useState("");
  const [security, setSecurity] = useState<CasevacSecurity>("N");
  const [marking, setMarking] = useState("");
  const [nationality, setNationality] = useState("");
  const [notes, setNotes] = useState("");

  const hasFix = self.lat != null && self.lng != null;

  const submit = () => {
    if (!hasFix) return;
    sendCasevac({
      lat: self.lat!,
      lng: self.lng!,
      freq: freq.trim() || undefined,
      urgent: num(urgent),
      priority: num(priority),
      routine: num(routine),
      equipment: equipment.trim() || undefined,
      litter: num(litter),
      ambulatory: num(ambulatory),
      security,
      marking: marking.trim() || undefined,
      nationality: nationality.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-sm rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-sm font-bold text-tac-danger">
            <Cross className="h-4 w-4" /> CASEVAC · 9-LINE
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-tac-muted hover:text-tac-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className={LABEL}>L1 · Punto de recogida</div>
          <div className="font-mono text-[12px] text-tac-accent">
            {hasFix ? formatGrid(self.lat!, self.lng!) : <span className="text-tac-danger">Sin posición — fija tu GPS</span>}
          </div>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>L2 · Frecuencia / indicativo</span>
            <input value={freq} onChange={(e) => setFreq(e.target.value)} className={FIELD} placeholder="ej. 31.55 / MEDEVAC-1" />
          </label>

          <span className={LABEL}>L3 · Pacientes por precedencia</span>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-tac-danger">Urgente</span>
              <input value={urgent} onChange={(e) => setUrgent(e.target.value)} inputMode="numeric" className={FIELD} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-tac-warn">Prioritario</span>
              <input value={priority} onChange={(e) => setPriority(e.target.value)} inputMode="numeric" className={FIELD} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-tac-muted">Rutina</span>
              <input value={routine} onChange={(e) => setRoutine(e.target.value)} inputMode="numeric" className={FIELD} placeholder="0" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>L4 · Equipo especial</span>
            <input value={equipment} onChange={(e) => setEquipment(e.target.value)} className={FIELD} placeholder="ninguno / grúa / ventilador" />
          </label>

          <span className={LABEL}>L5 · Pacientes por tipo</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-tac-muted">Camilla</span>
              <input value={litter} onChange={(e) => setLitter(e.target.value)} inputMode="numeric" className={FIELD} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-tac-muted">Ambulatorio</span>
              <input value={ambulatory} onChange={(e) => setAmbulatory(e.target.value)} inputMode="numeric" className={FIELD} placeholder="0" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>L6 · Seguridad en el punto</span>
            <select value={security} onChange={(e) => setSecurity(e.target.value as CasevacSecurity)} className={FIELD}>
              {(Object.keys(CASEVAC_SECURITY_LABELS) as CasevacSecurity[]).map((k) => (
                <option key={k} value={k}>{CASEVAC_SECURITY_LABELS[k]}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>L7 · Marcaje del punto</span>
            <input value={marking} onChange={(e) => setMarking(e.target.value)} className={FIELD} placeholder="humo / panel / luz IR" />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>L8 · Nacionalidad / estado</span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={FIELD} placeholder="propio / civil / EPW" />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>L9 · Terreno / NBQ</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} placeholder="terreno, contaminación" />
          </label>

          <Button variant="accent" className="mt-1 w-full py-2.5" disabled={!hasFix} onClick={submit}>
            Emitir CASEVAC
          </Button>
        </div>
      </div>
    </div>
  );
}
