"use client";

import { useState } from "react";
import { ChevronDown, Clock, Lock, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { colorBordeEntidad, ASIGNACION_TIPO_LABEL, BLOQUEO_MOTIVO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { EspacioTipoIcon } from "@/components/ui/tipo-icon";
import { horaCorta } from "@/lib/date";
import { BloqueActions } from "./bloque-actions";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo, RdEspacio, RdEspacioConflicto } from "@/lib/db/types";
import type { VentanaDisponible } from "@/lib/disponibilidad";

export function BloqueList({
  espacios,
  asignaciones,
  bloqueos,
  conflictos,
  disponibilidad,
  fechaPasada,
  recintoId,
  onSlotClick,
  onAsignacionClick,
}: {
  espacios: RdEspacio[];
  asignaciones: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  conflictos: RdEspacioConflicto[];
  disponibilidad: Record<string, VentanaDisponible[]>;
  fechaPasada: boolean;
  recintoId: string;
  onSlotClick: (espacioId: string, horaInicio: string, horaFinDisponibleHasta: string) => void;
  onAsignacionClick: (asignacion: AsignacionConDetalle) => void;
}) {
  // Igual criterio que en bloque-grid.tsx: un espacio de uso secundario sin
  // asignaciones el día visible se muestra colapsado (fila compacta con botón para
  // expandir) en vez del bloque completo. No persiste entre días a propósito.
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

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
        // Un bloqueo con hora_inicio/hora_fin solo ocupa ese tramo (migración 0015) —
        // fuera de ese rango el espacio sigue disponible. Sin horario, sigue ocupando
        // el día completo (feriados, cierres totales).
        const bloqueoDiaCompleto = Boolean(bloqueo) && (!bloqueo!.hora_inicio || !bloqueo!.hora_fin);
        const asignacionesEspacio = asignaciones
          .filter((a) => a.espacio_id === espacio.id)
          .sort((a, b) => (a.hora_inicio < b.hora_inicio ? -1 : 1));
        const huecos = disponibilidad[espacio.id] ?? [];

        const relacionados = conflictos
          .filter((c) => c.espacio_a === espacio.id || c.espacio_b === espacio.id)
          .map((c) => (c.espacio_a === espacio.id ? c.espacio_b : c.espacio_a));
        const espejos = asignaciones.filter((a) => relacionados.includes(a.espacio_id));

        if (asignacionesEspacio.length === 0 && huecos.length === 0 && !bloqueo && espejos.length === 0) return null;

        const colapsado =
          espacio.es_secundario && !expandidos.has(espacio.id) && asignacionesEspacio.length === 0;

        if (colapsado) {
          return (
            <button
              key={espacio.id}
              type="button"
              onClick={() => setExpandidos((prev) => new Set(prev).add(espacio.id))}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                <EspacioTipoIcon tipo={espacio.tipo} size={13} />
                {espacio.nombre} · sin uso hoy
              </span>
              <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
            </button>
          );
        }

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
                  <p className="text-sm font-medium text-[var(--color-text)]" title={bloqueo.descripcion ?? undefined}>
                    Bloqueado{bloqueo.hora_inicio && bloqueo.hora_fin
                      ? ` ${horaCorta(bloqueo.hora_inicio)}–${horaCorta(bloqueo.hora_fin)}`
                      : " (día completo)"}{" "}
                    — {BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}
                  </p>
                </Card>
              )}

              {!bloqueoDiaCompleto &&
                espejos.map((a) => (
                  <Card
                    key={`espejo-${a.id}`}
                    borderColorClass="border-l-gray-400"
                    className="flex items-start gap-3"
                    onClick={() =>
                      window.alert(
                        `Este espacio no está disponible: la cancha está dividida y en uso por ${a.entidad?.nombre ?? "otra organización"} de ${horaCorta(
                          a.hora_inicio
                        )} a ${horaCorta(a.hora_fin)}.`
                      )
                    }
                  >
                    <Lock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        Ocupada — cancha dividida en uso ({horaCorta(a.hora_inicio)}–{horaCorta(a.hora_fin)})
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">{a.entidad?.nombre ?? "—"}</p>
                    </div>
                  </Card>
                ))}

              {asignacionesEspacio.map((a) => (
                <Card
                  key={a.id}
                  borderColorClass={a.entidad ? colorBordeEntidad(a.entidad.tipo) : "border-l-gray-400"}
                  className="flex items-center justify-between"
                  onClick={() => onAsignacionClick(a)}
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
                  <div onClick={(e) => e.stopPropagation()}>
                    <BloqueActions asignacionId={a.id} usoEfectivo={a.uso_efectivo} mostrarUso={fechaPasada} />
                  </div>
                </Card>
              ))}

              {!bloqueoDiaCompleto &&
                huecos
                  .filter(
                    (hueco) => !espejos.some((a) => a.hora_inicio < hueco.horaFin && hueco.horaInicio < a.hora_fin)
                  )
                  .map((hueco) => (
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
