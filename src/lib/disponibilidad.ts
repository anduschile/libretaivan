import { minutosEntre } from "@/lib/date";
import type { RdAsignacion, RdBloqueo, RdEspacio, RdEspacioConflicto, RdHorarioOperacion } from "@/lib/db/types";

export type VentanaDisponible = { horaInicio: string; horaFin: string };

/**
 * Ids de los espacios relacionados a uno por rd_espacio_conflicto (ej. Espacio 1 y
 * Espacio 2 de la Piscina Municipal (completa), o las transversales de la Cancha
 * Principal) — mismo criterio que ya usa el espejo de asignaciones en page.tsx.
 */
export function espaciosRelacionados(
  espacioId: string,
  conflictos: Pick<RdEspacioConflicto, "espacio_a" | "espacio_b">[]
): string[] {
  return conflictos
    .filter((c) => c.espacio_a === espacioId || c.espacio_b === espacioId)
    .map((c) => (c.espacio_a === espacioId ? c.espacio_b : c.espacio_a));
}

/**
 * Bloqueos "propios" de un espacio (por espacio_id, o a nivel de recinto completo)
 * más los de sus espacios relacionados, remapeados como si fueran de este espacio.
 * Reemplaza a la migración 0024 (revertida): en vez de duplicar filas en
 * rd_bloqueo cada vez que se carga un bloqueo nuevo, "Piscina Municipal
 * (completa)" (o cualquier otro espacio "padre" que use este patrón, ej. Cancha
 * Principal) lo calcula en cada lectura a partir de lo que ya existe en Espacio
 * 1/2 — un bloqueo mirado desde el espacio padre no necesita distinguir de cuál
 * mitad viene (a diferencia del espejo de asignaciones, que sí muestra qué
 * entidad ocupa cada mitad), así que remapearlo basta.
 */
export function bloqueosConEspejo(
  espacioId: string,
  recintoId: string,
  bloqueos: RdBloqueo[],
  conflictos: Pick<RdEspacioConflicto, "espacio_a" | "espacio_b">[]
): RdBloqueo[] {
  const relacionados = espaciosRelacionados(espacioId, conflictos);
  const propios = bloqueos.filter(
    (b) => b.espacio_id === espacioId || (!b.espacio_id && b.recinto_id === recintoId)
  );
  const espejo = bloqueos
    .filter((b) => b.espacio_id && relacionados.includes(b.espacio_id))
    .map((b) => ({ ...b, espacio_id: espacioId }));
  return [...propios, ...espejo];
}

/**
 * Calcula, para cada espacio, los huecos libres del día (>= minMinutos) entre su
 * horario de operación, las asignaciones ya confirmadas y los bloqueos vigentes. Un
 * bloqueo sin hora_inicio/hora_fin (ver migración 0015) ocupa el día completo — el
 * mismo comportamiento que tenía cualquier bloqueo antes de esa migración, mantenido
 * retrocompatible para feriados/cierres totales. Un bloqueo con hora_inicio/hora_fin
 * solo descuenta ese tramo, igual que una asignación más. Es una función pura — no
 * consulta la base de datos — para poder usarla tanto en server como en cliente.
 */
export function calcularDisponibilidad({
  espacios,
  horarios,
  ocupadas,
  bloqueosPorEspacio,
  minMinutos = 60,
}: {
  espacios: Pick<RdEspacio, "id">[];
  horarios: Pick<RdHorarioOperacion, "espacio_id" | "hora_apertura" | "hora_cierre">[];
  ocupadas: Pick<RdAsignacion, "espacio_id" | "hora_inicio" | "hora_fin">[];
  bloqueosPorEspacio: Map<string, Pick<RdBloqueo, "hora_inicio" | "hora_fin">[]>;
  minMinutos?: number;
}): Map<string, VentanaDisponible[]> {
  const resultado = new Map<string, VentanaDisponible[]>();
  const horarioRecinto = horarios.find((h) => !h.espacio_id);

  for (const espacio of espacios) {
    const bloqueosEspacio = bloqueosPorEspacio.get(espacio.id) ?? [];
    if (bloqueosEspacio.some((b) => !b.hora_inicio || !b.hora_fin)) continue;

    const ventanaBase = horarios.find((h) => h.espacio_id === espacio.id) ?? horarioRecinto;
    if (!ventanaBase) continue;

    const ocupadasEspacio = [
      ...ocupadas.filter((a) => a.espacio_id === espacio.id).map((a) => [a.hora_inicio, a.hora_fin] as const),
      ...bloqueosEspacio.map((b) => [b.hora_inicio!, b.hora_fin!] as const),
    ].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const huecos: VentanaDisponible[] = [];
    let cursor = ventanaBase.hora_apertura;

    for (const [inicio, fin] of ocupadasEspacio) {
      if (inicio > cursor && minutosEntre(cursor, inicio) >= minMinutos) {
        huecos.push({ horaInicio: cursor, horaFin: inicio });
      }
      if (fin > cursor) cursor = fin;
    }
    if (cursor < ventanaBase.hora_cierre && minutosEntre(cursor, ventanaBase.hora_cierre) >= minMinutos) {
      huecos.push({ horaInicio: cursor, horaFin: ventanaBase.hora_cierre });
    }

    if (huecos.length > 0) resultado.set(espacio.id, huecos);
  }

  return resultado;
}

/** Hora de fin sugerida al pinchar un hueco: +1 hora, sin pasarse del fin del hueco. */
export function sugerirHoraFin(horaInicio: string, horaFinHueco: string): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + 60;
  const sugerida = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return sugerida < horaFinHueco ? sugerida : horaFinHueco;
}
