"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { guardarEspacio, type FormState } from "./actions";
import type { RdEspacio } from "@/lib/db/types";

const initialState: FormState = { error: null };

export function EspacioFormButton({
  recintoId,
  espacio,
}: {
  recintoId: string;
  espacio?: RdEspacio;
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useFormAction(guardarEspacio, initialState, () => setOpen(false));

  return (
    <>
      {espacio ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
          aria-label="Editar espacio"
        >
          <Pencil size={16} />
        </button>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Agregar espacio
        </Button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={espacio ? "Editar espacio" : "Nuevo espacio"}>
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="recinto_id" value={recintoId} />
          {espacio && <input type="hidden" name="id" value={espacio.id} />}

          <Field label="Nombre">
            <input name="nombre" required defaultValue={espacio?.nombre} className="input" />
          </Field>

          <Field label="Tipo (opcional)">
            <input
              name="tipo"
              placeholder="cancha, media_cancha, sala, piscina…"
              defaultValue={espacio?.tipo ?? ""}
              className="input"
            />
          </Field>

          <Field label="Capacidad referencial (opcional)">
            <input
              name="capacidad_referencial"
              type="number"
              min={0}
              defaultValue={espacio?.capacidad_referencial ?? ""}
              className="input"
            />
          </Field>

          <Field label="Actividad fija (opcional)">
            <input
              name="actividad_fija"
              placeholder="ej. patinaje — dejar vacío si es multiuso"
              defaultValue={espacio?.actividad_fija ?? ""}
              className="input"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
            <input type="checkbox" name="activo" defaultChecked={espacio?.activo ?? true} />
            Activo
          </label>

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
