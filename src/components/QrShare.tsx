"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { buildJoinUrl } from "@/lib/join";

/**
 * Share the current net as a QR. A teammate scans it with their phone camera,
 * which opens the app pre-filled with this room + passphrase. The secret rides
 * the link, so only share it with people you want on the net.
 */
export function QrShare({ onClose }: { onClose: () => void }) {
  const room = useStore((s) => s.self.room);
  const secret = useStore((s) => s.self.secret);
  const [svg, setSvg] = useState("");

  const url = buildJoinUrl({
    room,
    secret: secret?.trim() || undefined,
    relay: process.env.NEXT_PUBLIC_RELAY_URL,
  });

  useEffect(() => {
    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      width: 240,
      color: { dark: "#0a0e0d", light: "#e8f0ee" },
    })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-[var(--radius-tac)] border border-tac-line bg-tac-bg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-sm font-bold text-tac-accent">
            <QrCode className="h-4 w-4" /> Compartir sala
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-tac-muted hover:text-tac-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden rounded-[var(--radius-tac)] bg-[#e8f0ee]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <div className="mt-3 space-y-1 text-center">
          <div className="font-mono text-sm text-tac-text">
            Sala <span className="text-tac-accent">{room}</span>
          </div>
          <div className="text-[11px] text-tac-muted">
            {secret?.trim()
              ? "Incluye la clave de cifrado — compártela solo con tu equipo."
              : "Sin clave de cifrado (tráfico en claro)."}
          </div>
          <div className="text-[10px] leading-relaxed text-tac-muted">
            Escanea con la cámara del teléfono para unirse.
          </div>
        </div>
      </div>
    </div>
  );
}
