import { minutosEntre } from "@/lib/date";
import type { RdAsignacion, RdEspacio, RdHorarioOperacion } from "@/lib/db/types";

export type VentanaDisponible = { horaInicio: string; horaFin: string };

/**
 * Calcula, para cada espacio, los huecos libres del día (>= minMinutos) entre su
 * horario de operación y las asignaciones ya confirmadas. Los espacios bloqueados
 * todo el día (ver `bloqueadas`) no generan huecos. Es una función pura — no
 * consulta la base de datos — para poder usarla tanto en server como en cliente.
 */
export function calcularDisponibilidad({
  espacios,
  horarios,
  ocupadas,
  bloqueadas,
  minMinutos = 60,
}: {
  espacios: Pick<RdEspacio, "id">[];
  horarios: Pick<RdHorarioOperacion, "espacio_id" | "hora_apertura" | "hora_cierre">[];
  ocupadas: Pick<RdAsignacion, "espacio_id" | "hora_inicio" | "hora_fin">[];
  bloqueadas: Set<string>;
  minMinutos?: number;
}): Map<string, VentanaDisponible[]> {
  const resultado = new Map<string, VentanaDisponible[]>();
  const horarioRecinto = horarios.find((h) => !h.espacio_id);

  for (const espacio of espacios) {
    if (bloqueadas.has(espacio.id)) continue;

    const ventanaBase = horarios.find((h) => h.espacio_id === espacio.id) ?? horarioRecinto;
    if (!ventanaBase) continue;

    const ocupadasEspacio = ocupadas
      .filter((a) => a.espacio_id === espacio.id)
      .map((a) => [a.hora_inicio, a.hora_fin] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

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
