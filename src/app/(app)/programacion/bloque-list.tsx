"use client";

import { Clock, Lock, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { colorBordeEntidad, ASIGNACION_TIPO_LABEL, BLOQUEO_MOTIVO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { EspacioTipoIcon } from "@/components/ui/tipo-icon";
import { horaCorta } from "@/lib/date";
import { BloqueActions } from "./bloque-actions";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo, RdEspacio } from "@/lib/db/types";
import type { VentanaDisponible } from "@/lib/disponibilidad";

export function BloqueList({
  espacios,
  asignaciones,
  bloqueos,
  disponibilidad,
  fechaPasada,
  recintoId,
  onSlotClick,
}: {
  espacios: RdEspacio[];
  asignaciones: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  disponibilidad: Record<string, VentanaDisponible[]>;
  fechaPasada: boolean;
  recintoId: string;
  onSlotClick: (espacioId: string, horaInicio: string, horaFinDisponibleHasta: string) => void;
}) {
  if (espacios.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-[var(--color-text-muted)] desktop:hidden">
        Este recinto todavía no tiene espacios.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-2 desktop:hidden">
      {espacios.map((espacio) => {
        const bloqueo = bloqueos.find(
          (b) => b.espacio_id === espacio.id || (!b.espacio_id && b.recinto_id === recintoId)
        );
        const asignacionesEspacio = asignaciones
          .filter((a) => a.espacio_id === espacio.id)
          .sort((a, b) => (a.hora_inicio < b.hora_inicio ? -1 : 1));
        const huecos = disponibilidad[espacio.id] ?? [];

        if (asignacionesEspacio.length === 0 && huecos.length === 0 && !bloqueo) return null;

        return (
          <div key={espacio.id}>
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-[var(--color-text-muted)]">
              <EspacioTipoIcon tipo={espacio.tipo} size={13} />
              {espacio.nombre}
            </div>
            <div className="flex flex-col gap-2">
              {bloqueo && (
                <Card borderColorClass="border-l-gray-400" className="flex items-start gap-3">
                  <Lock size={16} className={`mt-0.5 shrink-0 ${TIPO_COLOR_TEXTO.bloqueo}`} />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      Bloqueado — {BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}
                    </p>
                    {bloqueo.descripcion && (
                      <p className="text-xs text-[var(--color-text-muted)]">{bloqueo.descripcion}</p>
                    )}
                  </div>
                </Card>
              )}

              {asignacionesEspacio.map((a) => (
                <Card
                  key={a.id}
                  borderColorClass={a.entidad ? colorBordeEntidad(a.entidad.tipo) : "border-l-gray-400"}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                      <Clock size={13} className="text-[var(--color-text-muted)]" />
                      {horaCorta(a.hora_inicio)}–{horaCorta(a.hora_fin)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {a.entidad?.nombre ?? "—"}
                      {a.actividad && ` · ${a.actividad}`} · {ASIGNACION_TIPO_LABEL[a.tipo]}
                    </p>
                  </div>
                  <BloqueActions asignacionId={a.id} usoEfectivo={a.uso_efectivo} mostrarUso={fechaPasada} />
                </Card>
              ))}

              {!bloqueo &&
                huecos.map((hueco) => (
                  <button
                    key={`${espacio.id}-${hueco.horaInicio}`}
                    type="button"
                    onClick={() => onSlotClick(espacio.id, hueco.horaInicio, hueco.horaFin)}
                    className="flex items-center justify-between rounded-2xl border border-dashed border-[var(--color-border)] bg-transparent p-4 text-left hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                  >
                    <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                      <Clock size={13} />
                      {horaCorta(hueco.horaInicio)}–{horaCorta(hueco.horaFin)} · Disponible
                    </span>
                    <Plus size={16} className="shrink-0 text-[var(--color-accent)]" />
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
