import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  RdAsignacion,
  RdBloqueo,
  RdConvenio,
  RdEntidad,
  RdEspacio,
  RdEspacioConflicto,
  RdHorarioOperacion,
  RdRecinto,
} from "@/lib/db/types";

export async function getRecintos(): Promise<RdRecinto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rd_recinto").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function getRecinto(id: string): Promise<RdRecinto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rd_recinto").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEspacios(recintoId?: string): Promise<RdEspacio[]> {
  const supabase = await createClient();
  let query = supabase.from("rd_espacio").select("*").order("nombre");
  if (recintoId) query = query.eq("recinto_id", recintoId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getEspacioConflictos(): Promise<RdEspacioConflicto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rd_espacio_conflicto").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getHorarios(recintoId?: string, espacioIds?: string[]): Promise<RdHorarioOperacion[]> {
  const supabase = await createClient();
  let query = supabase.from("rd_horario_operacion").select("*").order("dia_semana");
  // Las filas de horario a nivel de espacio tienen `recinto_id = null`, así que filtrar
  // solo por recinto_id se salta esas filas. Si además nos pasan los ids de los espacios
  // del recinto, se traen ambos tipos de fila con un OR.
  if (recintoId && espacioIds && espacioIds.length > 0) {
    query = query.or(`recinto_id.eq.${recintoId},espacio_id.in.(${espacioIds.join(",")})`);
  } else if (recintoId) {
    query = query.eq("recinto_id", recintoId);
  } else if (espacioIds && espacioIds.length > 0) {
    query = query.in("espacio_id", espacioIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getEntidades(): Promise<RdEntidad[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rd_entidad").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function getEntidad(id: string): Promise<RdEntidad | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rd_entidad").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getConvenios(): Promise<RdConvenio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rd_convenio")
    .select("*")
    .order("vigencia_desde", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type AsignacionConDetalle = RdAsignacion & {
  espacio: Pick<RdEspacio, "id" | "nombre" | "recinto_id"> | null;
  entidad: Pick<RdEntidad, "id" | "nombre" | "tipo"> | null;
};

export async function getAsignacionesEntreFechas(
  desde: string,
  hasta: string,
  espacioIds?: string[]
): Promise<AsignacionConDetalle[]> {
  // `espacioIds` definido pero vacío (ej. un espacio sin relaciones en
  // rd_espacio_conflicto) significa "ningún espacio calza" — debe devolver cero filas,
  // no todas. Antes de este chequeo, un array vacío saltaba el filtro `.in()` por
  // completo y la consulta devolvía TODAS las asignaciones confirmadas de la base sin
  // acotar por espacio (bug real: la vista de Semana mostraba asignaciones de la Sala
  // de Uso Múltiple como "espejo" en cualquier otro recinto sin conflictos definidos).
  if (espacioIds && espacioIds.length === 0) return [];

  const supabase = await createClient();
  let query = supabase
    .from("rd_asignacion")
    .select("*, espacio:rd_espacio(id, nombre, recinto_id), entidad:rd_entidad(id, nombre, tipo)")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .eq("estado", "confirmada")
    .order("fecha")
    .order("hora_inicio");
  if (espacioIds) {
    query = query.in("espacio_id", espacioIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AsignacionConDetalle[];
}

export async function getAsignacionesPorEspacioYRango(
  espacioIds: string[],
  desde: string,
  hasta: string
): Promise<RdAsignacion[]> {
  if (espacioIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rd_asignacion")
    .select("*")
    .in("espacio_id", espacioIds)
    .eq("estado", "confirmada")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (error) throw error;
  return data ?? [];
}

export async function getBloqueosEntreFechas(desde: string, hasta: string): Promise<RdBloqueo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rd_bloqueo")
    .select("*")
    .lte("fecha_desde", hasta)
    .gte("fecha_hasta", desde);
  if (error) throw error;
  return data ?? [];
}
