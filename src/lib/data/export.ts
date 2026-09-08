import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangoSemana } from "@/lib/date";
import type { RdEspacio, RdRecinto } from "@/lib/db/types";

export type FilaExport = {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  espacio_nombre: string;
  entidad_nombre: string;
  actividad: string | null;
  tipo: string;
};

export async function getSemanaParaExport(
  recintoId: string,
  fechaRef: string
): Promise<{ recinto: RdRecinto | null; espacios: RdEspacio[]; desde: string; hasta: string; filas: FilaExport[] }> {
  const supabase = await createClient();
  const { desde, hasta } = rangoSemana(fechaRef);

  const { data: recinto } = await supabase.from("rd_recinto").select("*").eq("id", recintoId).maybeSingle();
  const { data: espacios } = await supabase.from("rd_espacio").select("*").eq("recinto_id", recintoId).order("nombre");
  const espacioIds = (espacios ?? []).map((e) => e.id);

  if (espacioIds.length === 0) {
    return { recinto, espacios: espacios ?? [], desde, hasta, filas: [] };
  }

  const { data } = await supabase
    .from("rd_asignacion")
    .select("fecha, hora_inicio, hora_fin, tipo, actividad, espacio:rd_espacio(nombre), entidad:rd_entidad(nombre)")
    .in("espacio_id", espacioIds)
    .eq("estado", "confirmada")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha")
    .order("hora_inicio");

  const filas: FilaExport[] = ((data ?? []) as unknown as Array<{
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    tipo: string;
    actividad: string | null;
    espacio: { nombre: string } | null;
    entidad: { nombre: string } | null;
  }>).map((r) => ({
    fecha: r.fecha,
    hora_inicio: r.hora_inicio,
    hora_fin: r.hora_fin,
    espacio_nombre: r.espacio?.nombre ?? "—",
    entidad_nombre: r.entidad?.nombre ?? "—",
    actividad: r.actividad,
    tipo: r.tipo,
  }));

  return { recinto, espacios: espacios ?? [], desde, hasta, filas };
}
