import type { AsignacionParaEstadisticas } from "@/lib/data/queries";

export type FilaEstadistica = {
  id: string;
  nombre: string;
  horas: number;
  porcentaje: number;
};

/**
 * Cada fila de `filas` es una asignación confirmada de 1 hora (ver
 * getAsignacionesParaEstadisticas) — sumar horas es simplemente contar filas por
 * grupo. El porcentaje siempre se calcula sobre el total de TODAS las filas del
 * rango, no sobre el total del desglose (por eso "por entidad" y "por recinto" dan el
 * mismo total de horas y el mismo 100% acumulado, solo agrupado distinto).
 */
function agrupar(filas: AsignacionParaEstadisticas[], claveDe: (f: AsignacionParaEstadisticas) => [string, string] | null): FilaEstadistica[] {
  const totalHoras = filas.length;
  const porId = new Map<string, { nombre: string; horas: number }>();

  for (const fila of filas) {
    const clave = claveDe(fila);
    if (!clave) continue;
    const [id, nombre] = clave;
    const actual = porId.get(id);
    if (actual) {
      actual.horas += 1;
    } else {
      porId.set(id, { nombre, horas: 1 });
    }
  }

  return [...porId.entries()]
    .map(([id, { nombre, horas }]) => ({
      id,
      nombre,
      horas,
      porcentaje: totalHoras > 0 ? (horas / totalHoras) * 100 : 0,
    }))
    .sort((a, b) => b.horas - a.horas);
}

export function agruparPorEntidad(filas: AsignacionParaEstadisticas[]): FilaEstadistica[] {
  return agrupar(filas, (f) =>
    f.entidad_id ? [f.entidad_id, f.entidad_nombre ?? "Sin nombre"] : null
  );
}

export function agruparPorRecinto(filas: AsignacionParaEstadisticas[]): FilaEstadistica[] {
  return agrupar(filas, (f) =>
    f.recinto_id ? [f.recinto_id, f.recinto_nombre ?? "Sin nombre"] : null
  );
}
