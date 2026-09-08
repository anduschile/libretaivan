import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hoyISO, hoyDiaSemanaISO, minutosEntre } from "@/lib/date";
import type { RdBloqueo, RdRecinto } from "@/lib/db/types";

export type AlertaHoy =
  | { tipo: "bloqueo"; bloqueo: RdBloqueo; recintoNombre: string | null; espacioNombre: string | null }
  | {
      tipo: "uso_sin_registrar";
      asignacionId: string;
      fecha: string;
      espacioNombre: string;
      entidadNombre: string;
    }
  | {
      tipo: "directiva_vencida";
      entidadId: string;
      entidadNombre: string;
      vigenciaDirectiva: string;
    };

export type ResumenRecintoHoy = {
  recinto: RdRecinto;
  bloquesHoy: number;
  tieneBloqueo: boolean;
};

export type ResumenHoy = {
  fecha: string;
  bloquesHoy: number;
  organizacionesActivas: number;
  ocupacionPorcentaje: number;
  alertas: AlertaHoy[];
  porRecinto: ResumenRecintoHoy[];
};

export async function getResumenHoy(): Promise<ResumenHoy> {
  const supabase = await createClient();
  const fecha = hoyISO();
  const diaSemana = hoyDiaSemanaISO();

  const [{ data: recintos }, { data: espacios }, { data: horarios }, { data: asignacionesHoy }, { data: bloqueosHoy }] =
    await Promise.all([
      supabase.from("rd_recinto").select("*").order("nombre"),
      supabase.from("rd_espacio").select("id, recinto_id, nombre, activo").eq("activo", true),
      supabase.from("rd_horario_operacion").select("*").eq("dia_semana", diaSemana).eq("etiqueta", "normal"),
      supabase
        .from("rd_asignacion")
        .select("id, espacio_id, entidad_id, hora_inicio, hora_fin, uso_efectivo, espacio:rd_espacio(nombre, recinto_id), entidad:rd_entidad(nombre)")
        .eq("fecha", fecha)
        .eq("estado", "confirmada"),
      supabase.from("rd_bloqueo").select("*").lte("fecha_desde", fecha).gte("fecha_hasta", fecha),
    ]);

  const listaRecintos = recintos ?? [];
  const listaEspacios = espacios ?? [];
  const listaHorarios = horarios ?? [];
  const listaAsignaciones = (asignacionesHoy ?? []) as unknown as Array<{
    id: string;
    espacio_id: string;
    entidad_id: string;
    hora_inicio: string;
    hora_fin: string;
    uso_efectivo: boolean | null;
    espacio: { nombre: string; recinto_id: string } | null;
    entidad: { nombre: string } | null;
  }>;
  const listaBloqueos = (bloqueosHoy ?? []) as RdBloqueo[];

  // % de ocupación: horas reservadas hoy / horas disponibles hoy (horario normal), sobre espacios activos
  const minutosDisponiblesPorRecinto = new Map<string, number>();
  for (const h of listaHorarios) {
    if (!h.recinto_id) continue;
    const minutos = minutosEntre(h.hora_apertura, h.hora_cierre);
    const espaciosDelRecinto = listaEspacios.filter((e) => e.recinto_id === h.recinto_id).length || 1;
    minutosDisponiblesPorRecinto.set(
      h.recinto_id,
      (minutosDisponiblesPorRecinto.get(h.recinto_id) ?? 0) + minutos * espaciosDelRecinto
    );
  }
  const totalMinutosDisponibles = [...minutosDisponiblesPorRecinto.values()].reduce((a, b) => a + b, 0);
  const totalMinutosReservados = listaAsignaciones.reduce(
    (acc, a) => acc + minutosEntre(a.hora_inicio, a.hora_fin),
    0
  );
  const ocupacionPorcentaje =
    totalMinutosDisponibles > 0
      ? Math.round((totalMinutosReservados / totalMinutosDisponibles) * 100)
      : 0;

  const organizacionesActivas = new Set(listaAsignaciones.map((a) => a.entidad_id)).size;

  // Alertas: bloqueos vigentes hoy, uso_efectivo sin registrar (últimos 14 días) y directivas vencidas con actividad hoy
  const alertas: AlertaHoy[] = [];

  for (const b of listaBloqueos) {
    const recinto = listaRecintos.find((r) => r.id === b.recinto_id);
    const espacio = listaEspacios.find((e) => e.id === b.espacio_id);
    alertas.push({
      tipo: "bloqueo",
      bloqueo: b,
      recintoNombre: recinto?.nombre ?? null,
      espacioNombre: espacio?.nombre ?? null,
    });
  }

  const hace14Dias = new Date();
  hace14Dias.setDate(hace14Dias.getDate() - 14);
  const { data: pendientesUso } = await supabase
    .from("rd_asignacion")
    .select("id, fecha, espacio:rd_espacio(nombre), entidad:rd_entidad(nombre)")
    .is("uso_efectivo", null)
    .eq("estado", "confirmada")
    .lt("fecha", fecha)
    .gte("fecha", hace14Dias.toISOString().slice(0, 10))
    .order("fecha", { ascending: false })
    .limit(10);

  for (const p of (pendientesUso ?? []) as unknown as Array<{
    id: string;
    fecha: string;
    espacio: { nombre: string } | null;
    entidad: { nombre: string } | null;
  }>) {
    alertas.push({
      tipo: "uso_sin_registrar",
      asignacionId: p.id,
      fecha: p.fecha,
      espacioNombre: p.espacio?.nombre ?? "—",
      entidadNombre: p.entidad?.nombre ?? "—",
    });
  }

  const entidadIdsHoy = [...new Set(listaAsignaciones.map((a) => a.entidad_id))];
  if (entidadIdsHoy.length > 0) {
    const { data: entidadesHoy } = await supabase
      .from("rd_entidad")
      .select("id, nombre, vigencia_directiva")
      .in("id", entidadIdsHoy)
      .not("vigencia_directiva", "is", null)
      .lt("vigencia_directiva", fecha);
    for (const e of entidadesHoy ?? []) {
      alertas.push({
        tipo: "directiva_vencida",
        entidadId: e.id,
        entidadNombre: e.nombre,
        vigenciaDirectiva: e.vigencia_directiva as string,
      });
    }
  }

  const porRecinto: ResumenRecintoHoy[] = listaRecintos.map((r) => ({
    recinto: r,
    bloquesHoy: listaAsignaciones.filter((a) => a.espacio?.recinto_id === r.id).length,
    tieneBloqueo: listaBloqueos.some((b) => b.recinto_id === r.id || listaEspacios.some((e) => e.id === b.espacio_id && e.recinto_id === r.id)),
  }));

  return {
    fecha,
    bloquesHoy: listaAsignaciones.length,
    organizacionesActivas,
    ocupacionPorcentaje,
    alertas,
    porRecinto,
  };
}
