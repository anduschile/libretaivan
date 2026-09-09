"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatISO, parseISO } from "date-fns";
import { esFeriadoIrrenunciable } from "@/lib/date";

export type ConvenioFormState = {
  error: string | null;
  ok?: boolean;
  resumen?: {
    creadas: number;
    pendientes: { fecha: string; motivo: string }[];
  };
};

// Cuando el convenio no tiene fecha de término (vigencia_hasta = null, "hasta nuevo aviso"),
// generamos asignaciones para un horizonte fijo de 90 días en vez de generarlas indefinidamente.
// TODO(fase 2): agregar un job periódico que siga extendiendo el horizonte de los convenios
// abiertos, o generar las asignaciones "justo a tiempo" en vez de por adelantado.
const HORIZONTE_SIN_TERMINO_DIAS = 90;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

export async function crearConvenio(
  _prev: ConvenioFormState,
  formData: FormData
): Promise<ConvenioFormState> {
  const entidadId = str(formData, "entidad_id");
  const espacioId = str(formData, "espacio_id");
  const diasSemana = formData
    .getAll("dias_semana")
    .map((v) => Number(v))
    .filter((n) => n >= 1 && n <= 7);
  const horaInicio = str(formData, "hora_inicio");
  const horaFin = str(formData, "hora_fin");
  const vigenciaDesde = str(formData, "vigencia_desde");
  const vigenciaHasta = strOrNull(formData, "vigencia_hasta");
  const documentoRespaldo = strOrNull(formData, "documento_respaldo");
  const observaciones = strOrNull(formData, "observaciones");

  if (!entidadId || !espacioId || diasSemana.length === 0 || !horaInicio || !horaFin || !vigenciaDesde) {
    return { error: "Completa entidad, espacio, días, horario y fecha de inicio." };
  }
  if (horaInicio >= horaFin) {
    return { error: "La hora de inicio debe ser anterior a la hora de fin." };
  }

  const supabase = await createClient();

  const { data: convenio, error: errConvenio } = await supabase
    .from("rd_convenio")
    .insert({
      entidad_id: entidadId,
      espacio_id: espacioId,
      dias_semana: diasSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      vigencia_desde: vigenciaDesde,
      vigencia_hasta: vigenciaHasta,
      documento_respaldo: documentoRespaldo,
      estado: "activo",
      observaciones,
    })
    .select()
    .single();

  if (errConvenio || !convenio) {
    return { error: errConvenio?.message ?? "No se pudo crear el convenio." };
  }

  const inicio = parseISO(vigenciaDesde);
  const fin = vigenciaHasta ? parseISO(vigenciaHasta) : addDays(inicio, HORIZONTE_SIN_TERMINO_DIAS);

  const fechas: string[] = [];
  for (let d = inicio; d <= fin; d = addDays(d, 1)) {
    const isoDow = d.getDay() === 0 ? 7 : d.getDay();
    const fechaStr = formatISO(d, { representation: "date" });
    if (diasSemana.includes(isoDow) && !esFeriadoIrrenunciable(fechaStr)) {
      fechas.push(fechaStr);
    }
  }

  let creadas = 0;
  const pendientes: { fecha: string; motivo: string }[] = [];

  for (const fecha of fechas) {
    const { error } = await supabase.from("rd_asignacion").insert({
      espacio_id: espacioId,
      entidad_id: entidadId,
      convenio_id: convenio.id,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      tipo: "convenio",
      creado_por: "sistema (generación de convenio)",
    });

    if (error) {
      pendientes.push({
        fecha,
        motivo: error.code === "23P01" ? "Choca con otra asignación confirmada" : error.message,
      });
    } else {
      creadas++;
    }
  }

  revalidatePath("/organizaciones/convenios");
  revalidatePath("/programacion");
  revalidatePath("/hoy");

  return { error: null, ok: true, resumen: { creadas, pendientes } };
}

export async function cambiarEstadoConvenio(convenioId: string, estado: "activo" | "terminado" | "suspendido") {
  const supabase = await createClient();
  await supabase.from("rd_convenio").update({ estado }).eq("id", convenioId);
  revalidatePath("/organizaciones/convenios");
}
