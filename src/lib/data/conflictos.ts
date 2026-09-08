import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ConflictoDetalle = {
  espacioNombre: string;
  entidadNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  relacionado: boolean; // true = choque en un espacio "hermano" (rd_espacio_conflicto), no en el mismo espacio
};

/**
 * Pre-chequeo de conflicto para feedback en vivo en la UI, ANTES de intentar guardar.
 * La autoridad final sigue siendo la restricción de exclusión + el trigger en la base de datos:
 * esto solo evita que el encargado llene todo el formulario para recién enterarse del choque
 * al enviar.
 */
export async function verificarConflicto(params: {
  espacioId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  excluirAsignacionId?: string;
}): Promise<ConflictoDetalle | null> {
  const { espacioId, fecha, horaInicio, horaFin, excluirAsignacionId } = params;
  const supabase = await createClient();

  const { data: conflictos, error: errConflictos } = await supabase
    .from("rd_espacio_conflicto")
    .select("espacio_a, espacio_b")
    .or(`espacio_a.eq.${espacioId},espacio_b.eq.${espacioId}`);
  if (errConflictos) throw errConflictos;

  const espaciosRelacionados = (conflictos ?? []).map((c) =>
    c.espacio_a === espacioId ? c.espacio_b : c.espacio_a
  );
  const espaciosARevisar = [espacioId, ...espaciosRelacionados];

  let query = supabase
    .from("rd_asignacion")
    .select(
      "espacio_id, hora_inicio, hora_fin, fecha, espacio:rd_espacio(nombre), entidad:rd_entidad(nombre)"
    )
    .in("espacio_id", espaciosARevisar)
    .eq("estado", "confirmada")
    .eq("fecha", fecha)
    .lt("hora_inicio", horaFin)
    .gt("hora_fin", horaInicio);

  if (excluirAsignacionId) {
    query = query.neq("id", excluirAsignacionId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;

  const choque = data?.[0] as unknown as
    | {
        espacio_id: string;
        hora_inicio: string;
        hora_fin: string;
        fecha: string;
        espacio: { nombre: string } | null;
        entidad: { nombre: string } | null;
      }
    | undefined;

  if (!choque) return null;

  return {
    espacioNombre: choque.espacio?.nombre ?? "espacio relacionado",
    entidadNombre: choque.entidad?.nombre ?? "otra entidad",
    fecha: choque.fecha,
    horaInicio: choque.hora_inicio,
    horaFin: choque.hora_fin,
    relacionado: choque.espacio_id !== espacioId,
  };
}
