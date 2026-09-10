"use client";

import { useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { colorBordeEntidad, mensajeEspejoCorto, mensajeEspejoLargo, BLOQUEO_MOTIVO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { horaCorta } from "@/lib/date";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo, RdEspacio, RdEspacioConflicto, RecintoTipo } from "@/lib/db/types";

const ANCHO_COLUMNA_COLAPSADA = "40px";

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

// Un bloqueo sin hora_inicio/hora_fin (feriados, cierres totales) sigue ocupando el día
// completo — retrocompatible con los bloqueos existentes antes de la migración 0015.
function bloqueaMinuto(bloqueo: RdBloqueo, filaMin: number): boolean {
  if (!bloqueo.hora_inicio || !bloqueo.hora_fin) return true;
  return minutos(bloqueo.hora_inicio) <= filaMin && minutos(bloqueo.hora_fin) > filaMin;
}

// Fusiona visualmente asignaciones consecutivas (sin hueco entre ellas) de la misma
// entidad y actividad en un solo bloque continuo — el modelo de datos sigue guardando
// una fila de 1 hora por cada una; esto es solo para no ver 6 bloques apilados cuando
// es en realidad una sola sesión larga (ej. Asociación de Tenis de Mesa 17:00-23:00).
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

// Agrupa asignaciones "espejo" (de espacios relacionados) que comparten exactamente el
// mismo horario en un solo bloque visual con los nombres de todas las entidades — el caso
// típico es que Transversal 1 y Transversal 2 estén ocupadas a la misma hora. Si los
// horarios no calzan exacto, cada uno queda en su propio grupo (se dibujan superpuestos,
// caso poco común).
function agruparPorHorario(items: AsignacionConDetalle[]): AsignacionConDetalle[][] {
  const grupos = new Map<string, AsignacionConDetalle[]>();
  for (const a of items) {
    const key = `${a.hora_inicio}|${a.hora_fin}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(a);
  }
  return [...grupos.values()];
}

export function BloqueGrid({
  espacios,
  asignaciones,
  bloqueos,
  conflictos,
  recintoId,
  tipoRecinto,
  onSlotClick,
  onAsignacionClick,
}: {
  espacios: RdEspacio[];
  asignaciones: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  conflictos: RdEspacioConflicto[];
  recintoId: string;
  tipoRecinto: RecintoTipo;
  onSlotClick: (espacioId: string, horaInicio: string, horaFinDisponibleHasta: string) => void;
  onAsignacionClick: (asignacion: AsignacionConDetalle) => void;
}) {
  // Espacios de uso secundario (ej. la Cancha chica de un estadio) se muestran
  // colapsados — franja angosta con un botón para expandir — cuando no tienen ninguna
  // asignación el día visible. Se reevalúa en cada render (día distinto = props
  // distintas = estado de expansión manual vuelve a su default) porque `expandidos` no
  // persiste entre días a propósito.
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  if (espacios.length === 0) return null;

  function estaColapsado(espacio: RdEspacio): boolean {
    if (!espacio.es_secundario || expandidos.has(espacio.id)) return false;
    return !asignaciones.some((a) => a.espacio_id === espacio.id);
  }

  function expandir(espacioId: string) {
    setExpandidos((prev) => new Set(prev).add(espacioId));
  }

  const horasEtiqueta = Array.from({ length: FILAS }, (_, i) => HORA_INICIO_GRILLA + i * PASO_MIN);

  function bloqueoDe(espacioId: string): RdBloqueo | undefined {
    return bloqueos.find((b) => b.espacio_id === espacioId || (!b.espacio_id && b.recinto_id === recintoId));
  }

  function espaciosRelacionados(espacioId: string): string[] {
    return conflictos
      .filter((c) => c.espacio_a === espacioId || c.espacio_b === espacioId)
      .map((c) => (c.espacio_a === espacioId ? c.espacio_b : c.espacio_a));
  }

  function espejosDe(espacioId: string): AsignacionConDetalle[] {
    const relacionados = espaciosRelacionados(espacioId);
    if (relacionados.length === 0) return [];
    return asignaciones.filter((a) => relacionados.includes(a.espacio_id));
  }

  function finDisponibleDesde(espacioId: string, desdeMin: number): number {
    const relacionados = espaciosRelacionados(espacioId);
    const siguientes = asignaciones
      .filter(
        (a) =>
          (a.espacio_id === espacioId || relacionados.includes(a.espacio_id)) && minutos(a.hora_inicio) >= desdeMin
      )
      .map((a) => minutos(a.hora_inicio));
    return siguientes.length > 0 ? Math.min(...siguientes, HORA_FIN_GRILLA) : HORA_FIN_GRILLA;
  }

  return (
    <div className="hidden overflow-x-auto px-8 py-4 desktop:block">
      <div
        className="grid min-w-[720px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{
          gridTemplateColumns: `72px ${espacios
            .map((e) => (estaColapsado(e) ? ANCHO_COLUMNA_COLAPSADA : "minmax(140px, 1fr)"))
            .join(" ")}`,
          gridTemplateRows: `40px repeat(${FILAS}, 34px)`,
        }}
      >
        {/* Encabezado */}
        <div className="border-b border-[var(--color-border)]" style={{ gridColumn: 1, gridRow: 1 }} />
        {espacios.map((e, i) =>
          estaColapsado(e) ? (
            <button
              key={e.id}
              type="button"
              title={`${e.nombre} — expandir`}
              onClick={() => expandir(e.id)}
              className="flex items-center justify-center border-b border-l border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)]"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <ChevronRight size={14} />
            </button>
          ) : (
            <div
              key={e.id}
              className="flex items-center justify-center border-b border-l border-[var(--color-border)] px-2 text-center text-xs font-medium text-[var(--color-text)]"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              {e.nombre}
            </div>
          )
        )}

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
          if (estaColapsado(e)) {
            return (
              <div
                key={`colapsado-${e.id}`}
                className="border-l border-t border-[var(--color-border)] bg-[var(--color-bg)]"
                style={{ gridColumn: i + 2, gridRow: `2 / ${FILAS + 2}` }}
              />
            );
          }
          const bloqueo = bloqueoDe(e.id);
          const espejos = espejosDe(e.id);
          return Array.from({ length: FILAS }, (_, fila) => {
            const filaMin = HORA_INICIO_GRILLA + fila * PASO_MIN;
            const horaInicioSlot = minutosATexto(filaMin);
            const ocupado = asignaciones.some(
              (a) => a.espacio_id === e.id && minutos(a.hora_inicio) <= filaMin && minutos(a.hora_fin) > filaMin
            );
            const ocupadoPorEspejo = espejos.some(
              (a) => minutos(a.hora_inicio) <= filaMin && minutos(a.hora_fin) > filaMin
            );
            const bloqueadoAhora = Boolean(bloqueo) && bloqueaMinuto(bloqueo!, filaMin);
            const disponible = !bloqueadoAhora && !ocupado && !ocupadoPorEspejo;
            return (
              <div
                key={`${e.id}-${fila}`}
                className={`border-l border-t border-[var(--color-border)] ${
                  disponible ? "cursor-pointer hover:bg-[var(--color-accent-soft)]" : ""
                }`}
                style={{ gridColumn: i + 2, gridRow: fila + 2 }}
                onClick={disponible ? () => onSlotClick(e.id, horaInicioSlot, minutosATexto(finDisponibleDesde(e.id, filaMin))) : undefined}
              />
            );
          });
        })}

        {/* Bloqueos: ocupan solo su tramo real de hora cuando lo tienen (migración
            0015); sin hora_inicio/hora_fin siguen ocupando toda la columna
            (retrocompatible — feriados, cierres totales). */}
        {espacios.map((e, i) => {
          const bloqueo = bloqueoDe(e.id);
          if (!bloqueo || estaColapsado(e)) return null;
          const tieneHorario = Boolean(bloqueo.hora_inicio && bloqueo.hora_fin);
          const inicio = tieneHorario ? Math.max(minutos(bloqueo.hora_inicio!), HORA_INICIO_GRILLA) : HORA_INICIO_GRILLA;
          const fin = tieneHorario ? Math.min(minutos(bloqueo.hora_fin!), HORA_FIN_GRILLA) : HORA_FIN_GRILLA;
          const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
          const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
          return (
            <div
              key={`bloqueo-${e.id}`}
              title={bloqueo.descripcion ?? BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}
              className="m-0.5 flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-l-4 border-l-gray-400 bg-[var(--color-bg)] px-2 py-1 text-center text-[11px] text-[var(--color-text-muted)]"
              style={{ gridColumn: i + 2, gridRow: `${filaInicio} / ${filaFin}` }}
            >
              <Lock size={14} className={`shrink-0 ${TIPO_COLOR_TEXTO.bloqueo}`} />
              <span className="w-full truncate font-medium">{BLOQUEO_MOTIVO_LABEL[bloqueo.motivo]}</span>
            </div>
          );
        })}

        {/* Espejo: la cancha/espacio se ve ocupada porque un espacio relacionado (ej. una
            transversal) tiene una asignación confirmada — no es clickeable para crear, y si
            se hace clic se advierte el conflicto en vez de abrir el formulario. */}
        {espacios.map((e, i) => {
          if (estaColapsado(e)) return null;
          const bloqueo = bloqueoDe(e.id);
          const grupos = agruparPorHorario(espejosDe(e.id));
          return grupos.map((grupo) => {
            const primero = grupo[0];
            const inicio = Math.max(minutos(primero.hora_inicio), HORA_INICIO_GRILLA);
            const fin = Math.min(minutos(primero.hora_fin), HORA_FIN_GRILLA);
            if (fin <= inicio) return null;
            // Si el propio espacio ya tiene una asignación real en este mismo rango, esa
            // manda (se dibuja después, encima) — el espejo solo llena huecos libres.
            const tapadoPorPropio = asignaciones.some(
              (a) => a.espacio_id === e.id && minutos(a.hora_inicio) < fin && inicio < minutos(a.hora_fin)
            );
            if (tapadoPorPropio) return null;
            // Igual criterio: si hay un bloqueo con hora que cubre este mismo tramo, el
            // bloqueo manda (ya se dibujó arriba); sin hora, cubre todo el día.
            if (bloqueo && bloqueaMinuto(bloqueo, inicio)) return null;
            const filaInicio = Math.floor((inicio - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
            const filaFin = Math.ceil((fin - HORA_INICIO_GRILLA) / PASO_MIN) + 2;
            const nombres = grupo.map((a) => a.entidad?.nombre ?? "—").join(" y ");
            const mensajeLargo = mensajeEspejoLargo(tipoRecinto, grupo.map((a) => a.entidad?.nombre ?? "—"));
            return (
              <div
                key={`espejo-${e.id}-${primero.hora_inicio}`}
                className="m-0.5 flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-l-4 border-l-gray-400 bg-[var(--color-bg)] px-1.5 py-1 text-center text-[10px] text-[var(--color-text-muted)]"
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
                <span className="w-full truncate font-medium">
                  {mensajeEspejoCorto(tipoRecinto, grupo.map((a) => a.entidad?.nombre ?? "—"))}
                </span>
                <span className="w-full truncate">{nombres}</span>
              </div>
            );
          });
        })}

        {/* Bloques — asignaciones consecutivas de la misma entidad/actividad se
            fusionan en un solo rectángulo visual (ver agruparConsecutivas). El clic
            para editar abre siempre la primera asignación real del grupo. */}
        {espacios.map((e, i) => {
          const grupos = agruparConsecutivas(asignaciones.filter((a) => a.espacio_id === e.id));
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
                className={`m-0.5 cursor-pointer overflow-hidden rounded-lg border-l-4 bg-[var(--color-accent-soft)] px-2 py-1 text-[11px] leading-tight hover:brightness-95 ${
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
