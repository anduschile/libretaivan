"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { guardarEntidad, type FormState } from "./actions";
import { ENTIDAD_TIPO_LABEL } from "@/lib/db/domain";
import type { RdEntidad } from "@/lib/db/types";

const initialState: FormState = { error: null };

export function EntidadFormButton({ entidad }: { entidad?: RdEntidad }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useFormAction(guardarEntidad, initialState, () => setOpen(false));

  return (
    <>
      {entidad ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
          aria-label="Editar organización"
        >
          <Pencil size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-sm font-medium text-white shadow-lg desktop:bottom-8 desktop:right-8"
        >
          <Plus size={18} />
          Nueva organización
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={entidad ? "Editar organización" : "Nueva organización"}>
        <form action={submit} className="flex flex-col gap-4">
          {entidad && <input type="hidden" name="id" value={entidad.id} />}

          <Field label="Nombre">
            <input name="nombre" required defaultValue={entidad?.nombre} className="input" />
          </Field>

          <Field label="Tipo">
            <select name="tipo" required defaultValue={entidad?.tipo ?? ""} className="input">
              <option value="" disabled>
                Selecciona…
              </option>
              {Object.entries(ENTIDAD_TIPO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="RUT (opcional)">
            <input name="rut" defaultValue={entidad?.rut ?? ""} className="input" />
          </Field>

          <Field label="Representante">
            <input name="representante" defaultValue={entidad?.representante ?? ""} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input name="telefono" defaultValue={entidad?.telefono ?? ""} className="input" />
            </Field>
            <Field label="Correo">
              <input name="correo" type="email" defaultValue={entidad?.correo ?? ""} className="input" />
            </Field>
          </div>

          <Field label="Vigencia de la directiva (opcional)">
            <input
              name="vigencia_directiva"
              type="date"
              defaultValue={entidad?.vigencia_directiva ?? ""}
              className="input"
            />
          </Field>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <input type="checkbox" name="personalidad_juridica" defaultChecked={entidad?.personalidad_juridica ?? false} />
              Tiene personalidad jurídica
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <input type="checkbox" name="con_fines_de_lucro" defaultChecked={entidad?.con_fines_de_lucro ?? false} />
              Con fines de lucro
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <input type="checkbox" name="activa" defaultChecked={entidad?.activa ?? true} />
              Activa
            </label>
          </div>

          {state.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
      {label}
      {children}
    </label>
  );
}
