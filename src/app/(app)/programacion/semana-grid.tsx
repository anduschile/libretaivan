"use client";

import { Lock } from "lucide-react";
import { colorBordeEntidad, BLOQUEO_MOTIVO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { horaCorta, hoyISO } from "@/lib/date";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo } from "@/lib/db/types";

const HORA_INICIO_GRILLA = 8 * 60; // 08:00
const HORA_FIN_GRILLA = 23 * 60; // 23:00
const PASO_MIN = 60; // bloques de una hora completa
const FILAS = (HORA_FIN_GRILLA - HORA_INICIO_GRILLA) / PASO_MIN;

function minutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutosATexto(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

const DIA_CORTO = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function etiquetaDia(fecha: string, i: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  return `${DIA_CORTO[i]} ${String(d.getDate()).padStart(2, "0")}`;
}

export function SemanaGrid({
  dias,
  espacioId,
  asignaciones,
  bloqueos,
  recintoId,
  onSlotClick,
}: {
  dias: string[];
  espacioId: string;
  asignaciones: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  recintoId: string;
  onSlotClick: (fecha: string, horaInicio: string, horaFinDisponibleHasta: string) => void;
}) {
  const hoy = hoyISO();
  const horasEtiqueta = Array.from({ length: FILAS }, (_, i) => HORA_INICIO_GRILLA + i * PASO_MIN);

  function bloqueoDe(fecha: string): RdBloqueo | undefined {
    return bloqueos.find(
      (b) =>
        (b.espacio_id === espacioId || (!b.espacio_id && b.recinto_id === recintoId)) &&
        b.fecha_desde <= fecha &&
        fecha <= b.fecha_hasta
    );
  }

  function finDisponibleDesde(fecha: string, desdeMin: number): number {
    const siguientes = asignaciones
      .filter((a) => a.fecha === fecha && minutos(a.hora_inicio) >= desdeMin)
      .map((a) => minutos(a.hora_inicio));
    return siguientes.length > 0 ? Math.min(...siguientes, HORA_FIN_GRILLA) : HORA_FIN_GRILLA;
  }

  return (
    <div className="overflow-x-auto px-4 py-4 desktop:px-8">
      <div
        className="grid min-w-[760px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{
          gridTemplateColumns: `56px repeat(7, minmax(96px, 1fr))`,
          gridTemplateRows: `40px repeat(${FILAS}, 34px)`,
        }}
      >
        <div className="border-b border-[var(--color-border)]" style={{ gridColumn: 1, gridRow: 1 }} />
        {dias.map((fecha, i) => (
          <div
            key={fecha}
            className={`flex flex-col items-center justify-center border-b border-l border-[var(--color-border)] text-center text-xs font-medium ${
              fecha === hoy ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-text)]"
            }`}
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            <span className="capitalize">{etiquetaDia(fecha, i)}</span>
          </div>
        ))}

        {horasEtiqueta.map((min, i) => (
          <div
            key={min}
            className="border-t border-[var(--color-border)] pr-2 text-right text-[10px] text-[var(--color-text-muted)]"
            style={{ gridColumn: 1, gridRow: i + 2 }}
          >
            {String(Math.floor(min / 60)).padStart(2, "0")}:00
          </div>
        ))}

        {dias.map((fecha, i) => {
          const bloqueo = bloqueoDe(fecha);
          return Array.from({ length: FILAS }, (_, fila) => {
            const horaInicioSlot = minutosATexto(HORA_INICIO_GRILLA + fila * PASO_MIN);
            const ocupado = asignaciones.some(
              (a) =>
                a.fecha === fecha &&
                minutos(a.hora_inicio) <= HORA_INICIO_GRILLA + fila * PASO_MIN &&
                minutos(a.hora_fin) > HORA_INICIO_GRILLA + fila * PASO_MIN
            );
            return (
              <div
                key={`${fecha}-${fila}`}
                className={`border-l border-t border-[var(--color-border)] ${
                  !bloqueo && !ocupado ? "cursor-pointer hover:bg-[var(--color-accent-soft)]" : ""
                }`}
                style={{ gridColumn: i + 2, gridRow: fila + 2 }}
                onClick={
                  !bloqueo && !ocupado
                    ? () =>
                        onSlotClick(
                          fecha,
                          horaInicioSlot,
                          minutosATexto(finDisponibleDesde(fecha, HORA_INICIO_GRILLA + fila * PASO_MIN))
                        )
                    : undefined
                }
              />
            );
          });
        })}

        {dias.map((fecha, i) => {
          const bloqueo = bloqueoDe(fecha);
          if (!bloqueo) return null;
          return (
            <div
              key={`bloqueo-${fecha}`}
              className="m-0.5 flex flex-col items-center justify-center gap-1 rounded-lg border-l-4 border-l-gray-400 bg-[var(--color-bg)] px-1 py-1 text-center text-[10px] text-[var(--color-text-muted)]"
              style={{ gridColumn: i + 2, gridRow: `2 / ${FILAS + 2}` }}
            >
              <Lock size={13} className={TIPO_COLOR_TEXTO.bloqueo} />
              <span className="font-medium">{BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}</span>
            </div>
          );
        })}

        {asignaciones.map((a) => {
          const columna = dias.indexOf(a.fecha);
          if (columna === -1) return null;
          const inicio = Math.max(minutos(a.hora_inicio), HORA_INICIO_GRILLA);
          const fin = Math.min(minutos(a.hora_fin), HORA_FIN_GRILLA);
          if (fin <= inicio) return null;
          const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
          const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;

          return (
            <div
              key={a.id}
              className={`m-0.5 overflow-hidden rounded-lg border-l-4 bg-[var(--color-accent-soft)] px-1.5 py-1 text-[10px] leading-tight ${
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
