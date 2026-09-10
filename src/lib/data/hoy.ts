import "server-only";
import { hoyISO, hoyDiaSemanaISO, esFeriadoIrrenunciable, minutosEntre, horaCorta } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { getRecintos, getEspacios, getAsignacionesParaEstadisticas, getAsignacionesEntreFechas, getBloqueosEntreFechas } from "@/lib/data/queries";
import { agruparPorRecinto, type FilaEstadistica } from "@/lib/estadisticas";
import type { BloqueoMotivo, EntidadTipo, RdEspacio, RdRecinto } from "@/lib/db/types";

export type BloqueoHoy = {
  id: string;
  motivo: BloqueoMotivo;
  descripcion: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  recintoNombre: string;
  espacioNombres: string[];
};

export type AgendaItemHoy = {
  id: string;
  horaInicio: string;
  horaFin: string;
  entidadNombre: string;
  entidadTipo: EntidadTipo | null;
  actividad: string | null;
  recintoId: string;
  recintoNombre: string;
  espacioNombre: string;
};

export type ResumenHoy = {
  fecha: string;
  esFeriado: boolean;
  horasOcupadas: number;
  horasFuncionamiento: number;
  recintosActivos: number;
  totalRecintos: number;
  ranking: FilaEstadistica[];
  bloqueos: BloqueoHoy[];
  agenda: AgendaItemHoy[];
};

// Tope del mini-ranking "recintos con más movimiento hoy" — es un primer vistazo,
// no la lista completa (esa ya existe, agrupada, en el panel de Estadísticas).
const LIMITE_RANKING = 5;

export async function getResumenHoy(): Promise<ResumenHoy> {
  const fecha = hoyISO();
  const diaSemana = hoyDiaSemanaISO();
  const esFeriado = esFeriadoIrrenunciable(fecha);
  const supabase = await createClient();

  const [recintos, espacios, filasEstadisticas, asignacionesHoy, bloqueosHoy, { data: horariosHoy, error: errorHorarios }] =
    await Promise.all([
      getRecintos(),
      getEspacios(),
      // Misma agregación que usa el panel de Estadísticas (cada fila = 1 hora
      // ocupada, ver getAsignacionesParaEstadisticas), acotada a hoy — así el
      // ranking y el total de horas de esta página nunca pueden desalinearse de
      // lo que muestra Estadísticas si se filtrara por el día de hoy.
      getAsignacionesParaEstadisticas(fecha, fecha),
      getAsignacionesEntreFechas(fecha, fecha),
      getBloqueosEntreFechas(fecha, fecha),
      supabase
        .from("rd_horario_operacion")
        .select("recinto_id, hora_apertura, hora_cierre")
        .eq("dia_semana", diaSemana)
        .eq("etiqueta", "normal")
        .not("recinto_id", "is", null),
    ]);
  if (errorHorarios) throw errorHorarios;

  const recintoPorId = new Map(recintos.map((r) => [r.id, r]));

  // Horas de funcionamiento hoy: horario de apertura a cierre a nivel de RECINTO
  // (no multiplicado por cantidad de espacios — con espacios "espejo" como Piscina
  // Municipal (completa) o Cancha Principal/Transversales eso contaría capacidad
  // física dos veces). Un recinto sin fila en rd_horario_operacion (ej. Piscina
  // Municipal, pendiente desde la migración 0010) simplemente no suma acá — vacío
  // de datos real, no se inventa un horario para rellenarlo.
  const horasFuncionamiento = (horariosHoy ?? []).reduce(
    (acc, h) => acc + minutosEntre(h.hora_apertura, h.hora_cierre) / 60,
    0
  );

  const horasOcupadas = filasEstadisticas.length;
  const ranking = agruparPorRecinto(filasEstadisticas).slice(0, LIMITE_RANKING);
  const recintosActivos = new Set(
    filasEstadisticas.map((f) => f.recinto_id).filter((id): id is string => Boolean(id))
  ).size;

  const agenda: AgendaItemHoy[] = asignacionesHoy
    .filter((a) => a.espacio && a.entidad)
    .map((a) => ({
      id: a.id,
      horaInicio: horaCorta(a.hora_inicio),
      horaFin: horaCorta(a.hora_fin),
      entidadNombre: a.entidad!.nombre,
      entidadTipo: a.entidad!.tipo,
      actividad: a.actividad,
      recintoId: a.espacio!.recinto_id,
      recintoNombre: recintoPorId.get(a.espacio!.recinto_id)?.nombre ?? "—",
      espacioNombre: a.espacio!.nombre,
    }));

  return {
    fecha,
    esFeriado,
    horasOcupadas,
    horasFuncionamiento,
    recintosActivos,
    totalRecintos: recintos.length,
    ranking,
    bloqueos: esFeriado ? [] : agruparBloqueosHoy(bloqueosHoy, recintos, espacios),
    agenda,
  };
}

/**
 * Un bloqueo recurrente (ej. la colación del personal) se carga por separado en
 * cada espacio de un recinto dividido (ver migraciones 0007/0019) — acá se agrupan
 * de vuelta en una sola alerta por recinto+horario+motivo, listando los espacios
 * afectados, en vez de mostrar una tarjeta casi idéntica por cada espacio.
 */
function agruparBloqueosHoy(
  bloqueos: Awaited<ReturnType<typeof getBloqueosEntreFechas>>,
  recintos: RdRecinto[],
  espacios: RdEspacio[]
): BloqueoHoy[] {
  const recintoPorId = new Map(recintos.map((r) => [r.id, r]));
  const espacioPorId = new Map(espacios.map((e) => [e.id, e]));

  const grupos = new Map<string, BloqueoHoy>();
  for (const b of bloqueos) {
    const espacio = b.espacio_id ? espacioPorId.get(b.espacio_id) : undefined;
    const recintoId = b.recinto_id ?? espacio?.recinto_id;
    const recinto = recintoId ? recintoPorId.get(recintoId) : undefined;
    if (!recinto) continue;

    const clave = [recinto.id, b.hora_inicio ?? "", b.hora_fin ?? "", b.motivo, b.descripcion ?? ""].join("|");
    const existente = grupos.get(clave);
    if (existente) {
      if (espacio && !existente.espacioNombres.includes(espacio.nombre)) {
        existente.espacioNombres.push(espacio.nombre);
      }
    } else {
      grupos.set(clave, {
        id: b.id,
        motivo: b.motivo,
        descripcion: b.descripcion,
        horaInicio: b.hora_inicio,
        horaFin: b.hora_fin,
        recintoNombre: recinto.nombre,
        espacioNombres: espacio ? [espacio.nombre] : [],
      });
    }
  }
  return [...grupos.values()];
}
