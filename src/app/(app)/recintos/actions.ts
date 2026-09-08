"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RecintoEstado, RecintoPropiedad, RecintoTipo } from "@/lib/db/types";

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

export async function guardarRecinto(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = strOrNull(formData, "id");
  const payload = {
    nombre: str(formData, "nombre"),
    tipo: str(formData, "tipo") as RecintoTipo,
    direccion: strOrNull(formData, "direccion"),
    propiedad: str(formData, "propiedad") as RecintoPropiedad,
    titular: strOrNull(formData, "titular"),
    estado: str(formData, "estado") as RecintoEstado,
  };

  if (!payload.nombre || !payload.tipo) {
    return { error: "Nombre y tipo son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("rd_recinto").update(payload).eq("id", id)
    : await supabase.from("rd_recinto").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/recintos");
  revalidatePath("/hoy");
  return { error: null, ok: true };
}

export async function guardarEspacio(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = strOrNull(formData, "id");
  const recintoId = str(formData, "recinto_id");
  const payload = {
    recinto_id: recintoId,
    nombre: str(formData, "nombre"),
    tipo: strOrNull(formData, "tipo"),
    capacidad_referencial: intOrNull(formData, "capacidad_referencial"),
    actividad_fija: strOrNull(formData, "actividad_fija"),
    activo: formData.get("activo") === "on",
  };

  if (!payload.nombre || !recintoId) {
    return { error: "Nombre es obligatorio." };
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("rd_espacio").update(payload).eq("id", id)
    : await supabase.from("rd_espacio").insert(payload);

  if (error) return { error: error.message };

  revalidatePath(`/recintos/${recintoId}`);
  revalidatePath("/recintos");
  return { error: null, ok: true };
}

export async function guardarHorario(_prev: FormState, formData: FormData): Promise<FormState> {
  const recintoId = str(formData, "recinto_id");
  const espacioId = strOrNull(formData, "espacio_id");
  const payload = {
    recinto_id: espacioId ? null : recintoId,
    espacio_id: espacioId,
    dia_semana: Number(str(formData, "dia_semana")),
    hora_apertura: str(formData, "hora_apertura"),
    hora_cierre: str(formData, "hora_cierre"),
    vigencia_desde: strOrNull(formData, "vigencia_desde"),
    vigencia_hasta: strOrNull(formData, "vigencia_hasta"),
    etiqueta: strOrNull(formData, "etiqueta") ?? "normal",
  };

  if (!payload.hora_apertura || !payload.hora_cierre || !payload.dia_semana) {
    return { error: "Completa día, hora de apertura y de cierre." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rd_horario_operacion").insert(payload);
  if (error) return { error: error.message };

  revalidatePath(`/recintos/${recintoId}`);
  return { error: null, ok: true };
}

export async function eliminarHorario(recintoId: string, horarioId: string) {
  const supabase = await createClient();
  await supabase.from("rd_horario_operacion").delete().eq("id", horarioId);
  revalidatePath(`/recintos/${recintoId}`);
}

export async function agregarConflicto(_prev: FormState, formData: FormData): Promise<FormState> {
  const recintoId = str(formData, "recinto_id");
  const espacioA = str(formData, "espacio_a");
  const espacioB = str(formData, "espacio_b");

  if (!espacioA || !espacioB || espacioA === espacioB) {
    return { error: "Elige dos espacios distintos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rd_espacio_conflicto").insert({
    espacio_a: espacioA,
    espacio_b: espacioB,
  });
  if (error) return { error: error.message };

  revalidatePath(`/recintos/${recintoId}`);
  return { error: null, ok: true };
}

export async function eliminarConflicto(recintoId: string, espacioA: string, espacioB: string) {
  const supabase = await createClient();
  await supabase
    .from("rd_espacio_conflicto")
    .delete()
    .eq("espacio_a", espacioA)
    .eq("espacio_b", espacioB);
  revalidatePath(`/recintos/${recintoId}`);
}
