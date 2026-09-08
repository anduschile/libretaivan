"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EntidadTipo } from "@/lib/db/types";

export type FormState = { error: string | null; ok?: boolean };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

export async function guardarEntidad(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = strOrNull(formData, "id");
  const payload = {
    nombre: str(formData, "nombre"),
    tipo: str(formData, "tipo") as EntidadTipo,
    con_fines_de_lucro: formData.get("con_fines_de_lucro") === "on",
    rut: strOrNull(formData, "rut"),
    personalidad_juridica: formData.get("personalidad_juridica") === "on",
    vigencia_directiva: strOrNull(formData, "vigencia_directiva"),
    representante: strOrNull(formData, "representante"),
    telefono: strOrNull(formData, "telefono"),
    correo: strOrNull(formData, "correo"),
    activa: formData.get("activa") === "on",
  };

  if (!payload.nombre || !payload.tipo) {
    return { error: "Nombre y tipo son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("rd_entidad").update(payload).eq("id", id)
    : await supabase.from("rd_entidad").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/organizaciones");
  return { error: null, ok: true };
}
