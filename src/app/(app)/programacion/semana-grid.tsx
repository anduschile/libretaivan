"use client";

import { Lock } from "lucide-react";
import { colorBordeEntidad, mensajeEspejoCorto, mensajeEspejoLargo, BLOQUEO_MOTIVO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { horaCorta, hoyISO } from "@/lib/date";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo, RecintoTipo } from "@/lib/db/types";

const HORA_INICIO_GRILLA = 8 * 60; // 08:00
const HORA_FIN_GRILLA = 23 * 60; // 23:00
// El negocio agenda en bloques de una hora completa, pero la Piscina tiene franjas
// divididas que arrancan a la media hora (09:30-10:30). Con filas de una hora la
// posición de ese bloque no calza con ninguna línea de grilla: floor/ceil lo
// estiraba a un rango de 09:00 a 11:00 (30 min de más a cada lado) en vez de
// mostrar el tramo real. Filas de 30 min resuelven esto para cualquier horario —
// un bloque de una hora alineado a la hora sigue ocupando exactamente 34px (2
// filas), igual que antes; uno que arranca a la media hora también ocupa 34px,
// en el lugar correcto.
const PASO_MIN = 30;
const FILAS = (HORA_FIN_GRILLA - HORA_INICIO_GRILLA) / PASO_MIN;
const ALTO_FILA_PX = 17;

function minutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutosATexto(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// Un bloqueo sin hora_inicio/hora_fin (feriados, cierres totales) sigue ocupando el día
// completo — retrocompatible con los bloqueos existentes antes de la migración 0015.
function bloqueaMinuto(bloqueo: RdBloqueo, filaMin: number): boolean {
  if (!bloqueo.hora_inicio || !bloqueo.hora_fin) return true;
  return minutos(bloqueo.hora_inicio) <= filaMin && minutos(bloqueo.hora_fin) > filaMin;
}

// Fusiona visualmente asignaciones consecutivas (sin hueco entre ellas) de la misma
// entidad y actividad en un solo bloque continuo (ver bloque-grid.tsx).
function agruparConsecutivas(items: AsignacionConDetalle[]): AsignacionConDetalle[][] {
  const ordenadas = [...items].sort((a, b) => (a.hora_inicio < b.hora_inicio ? -1 : 1));
  const grupos: AsignacionConDetalle[][] = [];
  for (const a of ordenadas) {
    const grupoActual = grupos[grupos.length - 1];
    const anterior = grupoActual?.[grupoActual.length - 1];
    if (anterior && anterior.entidad_id === a.entidad_id && anterior.actividad === a.actividad && anterior.hora_fin === a.hora_inicio) {
      grupoActual.push(a);
    } else {
      grupos.push([a]);
    }
  }
  return grupos;
}

// Agrupa asignaciones "espejo" que comparten exactamente el mismo horario en un solo
// bloque visual con los nombres de todas las entidades (ver bloque-grid.tsx).
function agruparPorHorario(items: AsignacionConDetalle[]): AsignacionConDetalle[][] {
  const grupos = new Map<string, AsignacionConDetalle[]>();
  for (const a of items) {
    const key = `${a.hora_inicio}|${a.hora_fin}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(a);
  }
  return [...grupos.values()];
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
  asignacionesEspejo,
  bloqueos,
  recintoId,
  tipoRecinto,
  onSlotClick,
  onAsignacionClick,
}: {
  dias: string[];
  espacioId: string;
  asignaciones: AsignacionConDetalle[];
  asignacionesEspejo: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  recintoId: string;
  tipoRecinto: RecintoTipo;
  onSlotClick: (fecha: string, horaInicio: string, horaFinDisponibleHasta: string) => void;
  onAsignacionClick: (asignacion: AsignacionConDetalle) => void;
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

  function espejosDe(fecha: string): AsignacionConDetalle[] {
    return asignacionesEspejo.filter((a) => a.fecha === fecha);
  }

  function finDisponibleDesde(fecha: string, desdeMin: number): number {
    const siguientes = [...asignaciones, ...asignacionesEspejo]
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
          gridTemplateRows: `40px repeat(${FILAS}, ${ALTO_FILA_PX}px)`,
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

        {horasEtiqueta
          .filter((min) => min % 60 === 0)
          .map((min) => (
            <div
              key={min}
              className="border-t border-[var(--color-border)] pr-2 text-right text-[10px] text-[var(--color-text-muted)]"
              style={{ gridColumn: 1, gridRow: `${(min - HORA_INICIO_GRILLA) / PASO_MIN + 2} / span 2` }}
            >
              {String(Math.floor(min / 60)).padStart(2, "0")}:00
            </div>
          ))}

        {dias.map((fecha, i) => {
          const bloqueo = bloqueoDe(fecha);
          const espejos = espejosDe(fecha);
          return Array.from({ length: FILAS }, (_, fila) => {
            const filaMin = HORA_INICIO_GRILLA + fila * PASO_MIN;
            const horaInicioSlot = minutosATexto(filaMin);
            const ocupado = asignaciones.some(
              (a) => a.fecha === fecha && minutos(a.hora_inicio) <= filaMin && minutos(a.hora_fin) > filaMin
            );
            const ocupadoPorEspejo = espejos.some(
              (a) => minutos(a.hora_inicio) <= filaMin && minutos(a.hora_fin) > filaMin
            );
            const bloqueadoAhora = Boolean(bloqueo) && bloqueaMinuto(bloqueo!, filaMin);
            const disponible = !bloqueadoAhora && !ocupado && !ocupadoPorEspejo;
            return (
              <div
                key={`${fecha}-${fila}`}
                className={`border-l border-[var(--color-border)] ${filaMin % 60 === 0 ? "border-t" : ""} ${
                  disponible ? "cursor-pointer hover:bg-[var(--color-accent-soft)]" : ""
                }`}
                style={{ gridColumn: i + 2, gridRow: fila + 2 }}
                onClick={
                  disponible
                    ? () => onSlotClick(fecha, horaInicioSlot, minutosATexto(finDisponibleDesde(fecha, filaMin)))
                    : undefined
                }
              />
            );
          });
        })}

        {dias.map((fecha, i) => {
          const bloqueo = bloqueoDe(fecha);
          if (!bloqueo) return null;
          const tieneHorario = Boolean(bloqueo.hora_inicio && bloqueo.hora_fin);
          const inicio = tieneHorario ? Math.max(minutos(bloqueo.hora_inicio!), HORA_INICIO_GRILLA) : HORA_INICIO_GRILLA;
          const fin = tieneHorario ? Math.min(minutos(bloqueo.hora_fin!), HORA_FIN_GRILLA) : HORA_FIN_GRILLA;
          const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
          const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
          return (
            <div
              key={`bloqueo-${fecha}`}
              title={bloqueo.descripcion ?? BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}
              className="m-0.5 flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-l-4 border-l-gray-400 bg-[var(--color-bg)] px-1 py-1 text-center text-[10px] text-[var(--color-text-muted)]"
              style={{ gridColumn: i + 2, gridRow: `${filaInicio} / ${filaFin}` }}
            >
              <Lock size={13} className={`shrink-0 ${TIPO_COLOR_TEXTO.bloqueo}`} />
              <span className="w-full truncate font-medium">{BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}</span>
            </div>
          );
        })}

        {/* Espejo: este espacio se ve ocupado porque un espacio relacionado (ej. la cancha
            principal completa, o la otra transversal) tiene una asignación confirmada. */}
        {dias.map((fecha, i) => {
          const bloqueo = bloqueoDe(fecha);
          const grupos = agruparPorHorario(espejosDe(fecha));
          return grupos.map((grupo) => {
            const primero = grupo[0];
            const inicio = Math.max(minutos(primero.hora_inicio), HORA_INICIO_GRILLA);
            const fin = Math.min(minutos(primero.hora_fin), HORA_FIN_GRILLA);
            if (fin <= inicio) return null;
            const tapadoPorPropio = asignaciones.some(
              (a) => a.fecha === fecha && minutos(a.hora_inicio) < fin && inicio < minutos(a.hora_fin)
            );
            if (tapadoPorPropio) return null;
            if (bloqueo && bloqueaMinuto(bloqueo, inicio)) return null;
            const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
            const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
            const nombresEntidades = grupo.map((a) => a.entidad?.nombre ?? "—");
            const mensajeLargo = mensajeEspejoLargo(tipoRecinto, nombresEntidades);
            return (
              <div
                key={`espejo-${fecha}-${primero.hora_inicio}`}
                className="m-0.5 flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-l-4 border-l-gray-400 bg-[var(--color-bg)] px-1 py-1 text-center text-[10px] text-[var(--color-text-muted)]"
                style={{ gridColumn: i + 2, gridRow: `${filaInicio} / ${filaFin}` }}
                title={mensajeLargo}
                onClick={() =>
                  window.alert(
                    `Este espacio no está disponible: ${mensajeLargo.toLowerCase()} (${horaCorta(
                      primero.hora_inicio
                    )} a ${horaCorta(primero.hora_fin)}).`
                  )
                }
              >
                <Lock size={12} className="shrink-0 text-gray-400" />
                <span className="w-full truncate font-medium">{mensajeEspejoCorto(tipoRecinto, nombresEntidades)}</span>
              </div>
            );
          });
        })}

        {dias.map((fecha, i) => {
          const grupos = agruparConsecutivas(asignaciones.filter((a) => a.fecha === fecha));
          return grupos.map((grupo) => {
            const primero = grupo[0];
            const ultimo = grupo[grupo.length - 1];
            const inicio = Math.max(minutos(primero.hora_inicio), HORA_INICIO_GRILLA);
            const fin = Math.min(minutos(ultimo.hora_fin), HORA_FIN_GRILLA);
            if (fin <= inicio) return null;
            const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
            const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;

            return (
              <div
                key={primero.id}
                className={`m-0.5 cursor-pointer overflow-hidden rounded-lg border-l-4 bg-[var(--color-accent-soft)] px-1.5 py-1 text-[10px] leading-tight hover:brightness-95 ${
                  primero.entidad ? colorBordeEntidad(primero.entidad.tipo) : "border-l-gray-400"
                }`}
                style={{ gridColumn: i + 2, gridRow: `${filaInicio} / ${filaFin}` }}
                title={`${primero.entidad?.nombre ?? ""} · ${horaCorta(primero.hora_inicio)}–${horaCorta(ultimo.hora_fin)} (clic para editar)`}
                onClick={() => onAsignacionClick(primero)}
              >
                <p className="truncate font-medium text-[var(--color-text)]">{primero.entidad?.nombre ?? "—"}</p>
                <p className="truncate text-[var(--color-text-muted)]">
                  {horaCorta(primero.hora_inicio)}–{horaCorta(ultimo.hora_fin)}
                </p>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
