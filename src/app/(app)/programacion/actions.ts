"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esFeriadoIrrenunciable } from "@/lib/date";
import type { AsignacionTipo } from "@/lib/db/types";

export type FormState = { error: string | null; ok?: boolean };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}
function intOrNull(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function crearAsignacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    espacio_id: str(formData, "espacio_id"),
    entidad_id: str(formData, "entidad_id"),
    fecha: str(formData, "fecha"),
    hora_inicio: str(formData, "hora_inicio"),
    hora_fin: str(formData, "hora_fin"),
    tipo: (str(formData, "tipo") || "puntual") as AsignacionTipo,
    actividad: strOrNull(formData, "actividad"),
    participantes_estimados: intOrNull(formData, "participantes_estimados"),
    documento_respaldo: strOrNull(formData, "documento_respaldo"),
    creado_por: "encargado",
  };

  if (!payload.espacio_id || !payload.entidad_id || !payload.fecha || !payload.hora_inicio || !payload.hora_fin) {
    return { error: "Completa espacio, organización, fecha y horario." };
  }
  if (payload.hora_inicio >= payload.hora_fin) {
    return { error: "La hora de inicio debe ser anterior a la hora de fin." };
  }
  if (esFeriadoIrrenunciable(payload.fecha)) {
    return { error: "Este día es feriado irrenunciable, el recinto no opera." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rd_asignacion").insert(payload);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Este horario choca con otra asignación confirmada en este espacio o en un espacio relacionado." };
    }
    if (error.message?.includes("Conflicto con espacio relacionado")) {
      return { error: error.message };
    }
    return { error: error.message };
  }

  revalidatePath("/programacion");
  revalidatePath("/hoy");
  return { error: null, ok: true };
}

export async function actualizarAsignacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const asignacionId = str(formData, "asignacion_id");
  if (!asignacionId) {
    return { error: "Falta el identificador de la asignación a editar." };
  }

  const payload = {
    espacio_id: str(formData, "espacio_id"),
    entidad_id: str(formData, "entidad_id"),
    fecha: str(formData, "fecha"),
    hora_inicio: str(formData, "hora_inicio"),
    hora_fin: str(formData, "hora_fin"),
    tipo: (str(formData, "tipo") || "puntual") as AsignacionTipo,
    actividad: strOrNull(formData, "actividad"),
    participantes_estimados: intOrNull(formData, "participantes_estimados"),
    documento_respaldo: strOrNull(formData, "documento_respaldo"),
  };

  if (!payload.espacio_id || !payload.entidad_id || !payload.fecha || !payload.hora_inicio || !payload.hora_fin) {
    return { error: "Completa espacio, organización, fecha y horario." };
  }
  if (payload.hora_inicio >= payload.hora_fin) {
    return { error: "La hora de inicio debe ser anterior a la hora de fin." };
  }
  if (esFeriadoIrrenunciable(payload.fecha)) {
    return { error: "Este día es feriado irrenunciable, el recinto no opera." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rd_asignacion").update(payload).eq("id", asignacionId);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Este horario choca con otra asignación confirmada en este espacio o en un espacio relacionado." };
    }
    if (error.message?.includes("Conflicto con espacio relacionado")) {
      return { error: error.message };
    }
    return { error: error.message };
  }

  revalidatePath("/programacion");
  revalidatePath("/hoy");
  return { error: null, ok: true };
}

export async function cancelarAsignacion(asignacionId: string) {
  const supabase = await createClient();
  await supabase.from("rd_asignacion").update({ estado: "cancelada" }).eq("id", asignacionId);
  revalidatePath("/programacion");
  revalidatePath("/hoy");
}

export async function marcarUsoEfectivo(asignacionId: string, usoEfectivo: boolean) {
  const supabase = await createClient();
  await supabase.from("rd_asignacion").update({ uso_efectivo: usoEfectivo }).eq("id", asignacionId);
  revalidatePath("/programacion");
  revalidatePath("/hoy");
}
