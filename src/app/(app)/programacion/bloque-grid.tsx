"use client";

import { Lock } from "lucide-react";
import { colorBordeEntidad, BLOQUEO_MOTIVO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { horaCorta } from "@/lib/date";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo, RdEspacio } from "@/lib/db/types";

const HORA_INICIO_GRILLA = 8 * 60; // 08:00
const HORA_FIN_GRILLA = 23 * 60; // 23:00
const PASO_MIN = 60; // el negocio solo agenda en bloques de una hora completa
const FILAS = (HORA_FIN_GRILLA - HORA_INICIO_GRILLA) / PASO_MIN;

function minutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutosATexto(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function BloqueGrid({
  espacios,
  asignaciones,
  bloqueos,
  recintoId,
  onSlotClick,
}: {
  espacios: RdEspacio[];
  asignaciones: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  recintoId: string;
  onSlotClick: (espacioId: string, horaInicio: string, horaFinDisponibleHasta: string) => void;
}) {
  if (espacios.length === 0) return null;

  const horasEtiqueta = Array.from({ length: FILAS }, (_, i) => HORA_INICIO_GRILLA + i * PASO_MIN);

  function bloqueoDe(espacioId: string): RdBloqueo | undefined {
    return bloqueos.find((b) => b.espacio_id === espacioId || (!b.espacio_id && b.recinto_id === recintoId));
  }

  function finDisponibleDesde(espacioId: string, desdeMin: number): number {
    const siguientes = asignaciones
      .filter((a) => a.espacio_id === espacioId && minutos(a.hora_inicio) >= desdeMin)
      .map((a) => minutos(a.hora_inicio));
    return siguientes.length > 0 ? Math.min(...siguientes, HORA_FIN_GRILLA) : HORA_FIN_GRILLA;
  }

  return (
    <div className="hidden overflow-x-auto px-8 py-4 desktop:block">
      <div
        className="grid min-w-[720px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{
          gridTemplateColumns: `72px repeat(${espacios.length}, minmax(140px, 1fr))`,
          gridTemplateRows: `40px repeat(${FILAS}, 34px)`,
        }}
      >
        {/* Encabezado */}
        <div className="border-b border-[var(--color-border)]" style={{ gridColumn: 1, gridRow: 1 }} />
        {espacios.map((e, i) => (
          <div
            key={e.id}
            className="flex items-center justify-center border-b border-l border-[var(--color-border)] px-2 text-center text-xs font-medium text-[var(--color-text)]"
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {e.nombre}
          </div>
        ))}

        {/* Líneas de hora */}
        {horasEtiqueta.map((min, i) => (
          <div
            key={min}
            className="border-t border-[var(--color-border)] pr-2 text-right text-[10px] text-[var(--color-text-muted)]"
            style={{ gridColumn: 1, gridRow: i + 2 }}
          >
            {String(Math.floor(min / 60)).padStart(2, "0")}:00
          </div>
        ))}

        {espacios.map((e, i) => {
          const bloqueo = bloqueoDe(e.id);
          return Array.from({ length: FILAS }, (_, fila) => {
            const horaInicioSlot = minutosATexto(HORA_INICIO_GRILLA + fila * PASO_MIN);
            const ocupado = asignaciones.some(
              (a) =>
                a.espacio_id === e.id &&
                minutos(a.hora_inicio) <= HORA_INICIO_GRILLA + fila * PASO_MIN &&
                minutos(a.hora_fin) > HORA_INICIO_GRILLA + fila * PASO_MIN
            );
            return (
              <div
                key={`${e.id}-${fila}`}
                className={`border-l border-t border-[var(--color-border)] ${
                  !bloqueo && !ocupado ? "cursor-pointer hover:bg-[var(--color-accent-soft)]" : ""
                }`}
                style={{ gridColumn: i + 2, gridRow: fila + 2 }}
                onClick={
                  !bloqueo && !ocupado
                    ? () =>
                        onSlotClick(
                          e.id,
                          horaInicioSlot,
                          minutosATexto(finDisponibleDesde(e.id, HORA_INICIO_GRILLA + fila * PASO_MIN))
                        )
                    : undefined
                }
              />
            );
          });
        })}

        {/* Bloqueos: ocupan toda la columna del espacio */}
        {espacios.map((e, i) => {
          const bloqueo = bloqueoDe(e.id);
          if (!bloqueo) return null;
          return (
            <div
              key={`bloqueo-${e.id}`}
              className="m-0.5 flex flex-col items-center justify-center gap-1 rounded-lg border-l-4 border-l-gray-400 bg-[var(--color-bg)] px-2 py-1 text-center text-[11px] text-[var(--color-text-muted)]"
              style={{ gridColumn: i + 2, gridRow: `2 / ${FILAS + 2}` }}
            >
              <Lock size={14} className={TIPO_COLOR_TEXTO.bloqueo} />
              <span className="font-medium">{BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}</span>
              {bloqueo.descripcion && <span className="truncate px-1">{bloqueo.descripcion}</span>}
            </div>
          );
        })}

        {/* Bloques */}
        {asignaciones.map((a) => {
          const columna = espacios.findIndex((e) => e.id === a.espacio_id);
          if (columna === -1) return null;
          const inicio = Math.max(minutos(a.hora_inicio), HORA_INICIO_GRILLA);
          const fin = Math.min(minutos(a.hora_fin), HORA_FIN_GRILLA);
          if (fin <= inicio) return null;
          const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
          const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;

          return (
            <div
              key={a.id}
              className={`m-0.5 overflow-hidden rounded-lg border-l-4 bg-[var(--color-accent-soft)] px-2 py-1 text-[11px] leading-tight ${
                a.entidad ? colorBordeEntidad(a.entidad.tipo) : "border-l-gray-400"
              }`}
              style={{ gridColumn: columna + 2, gridRow: `${filaInicio} / ${filaFin}` }}
              title={`${a.entidad?.nombre ?? ""} · ${horaCorta(a.hora_inicio)}–${horaCorta(a.hora_fin)}`}
            >
              <p className="truncate font-medium text-[var(--color-text)]">{a.entidad?.nombre ?? "—"}</p>
              <p className="truncate text-[var(--color-text-muted)]">
                {horaCorta(a.hora_inicio)}–{horaCorta(a.hora_fin)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
