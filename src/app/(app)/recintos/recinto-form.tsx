"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { guardarRecinto, type FormState } from "./actions";
import { RECINTO_TIPO_LABEL } from "@/lib/db/domain";
import type { RdRecinto } from "@/lib/db/types";

const initialState: FormState = { error: null };

export function RecintoFormButton({ recinto }: { recinto?: RdRecinto }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useFormAction(guardarRecinto, initialState, () => setOpen(false));

  return (
    <>
      {recinto ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
          aria-label="Editar recinto"
        >
          <Pencil size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-sm font-medium text-white shadow-lg desktop:bottom-8 desktop:right-8"
        >
          <Plus size={18} />
          Nuevo recinto
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={recinto ? "Editar recinto" : "Nuevo recinto"}>
        <form action={submit} className="flex flex-col gap-4">
          {recinto && <input type="hidden" name="id" value={recinto.id} />}

          <Field label="Nombre">
            <input name="nombre" required defaultValue={recinto?.nombre} className="input" />
          </Field>

          <Field label="Tipo">
            <select name="tipo" required defaultValue={recinto?.tipo ?? ""} className="input">
              <option value="" disabled>
                Selecciona…
              </option>
              {Object.entries(RECINTO_TIPO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Dirección">
            <input name="direccion" defaultValue={recinto?.direccion ?? ""} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Propiedad">
              <select name="propiedad" defaultValue={recinto?.propiedad ?? "propio"} className="input">
                <option value="propio">Propio</option>
                <option value="cedido">Cedido</option>
              </select>
            </Field>
            <Field label="Estado">
              <select name="estado" defaultValue={recinto?.estado ?? "operativo"} className="input">
                <option value="operativo">Operativo</option>
                <option value="mantencion">Mantención</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </Field>
          </div>

          <Field label="Titular (si es cedido)">
            <input name="titular" defaultValue={recinto?.titular ?? ""} className="input" />
          </Field>

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
