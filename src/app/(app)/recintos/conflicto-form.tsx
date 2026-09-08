"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { agregarConflicto, type FormState } from "./actions";
import type { RdEspacio } from "@/lib/db/types";

const initialState: FormState = { error: null };

export function ConflictoFormButton({ recintoId, espacios }: { recintoId: string; espacios: RdEspacio[] }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useFormAction(agregarConflicto, initialState, () => setOpen(false));

  if (espacios.length < 2) return null;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Agregar conflicto entre espacios
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Espacios mutuamente excluyentes">
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="recinto_id" value={recintoId} />
          <p className="text-xs text-[var(--color-text-muted)]">
            Marca dos espacios que no pueden usarse al mismo tiempo (ej. la cancha completa y una de
            sus mitades). El sistema bloqueará automáticamente la asignación que choque.
          </p>

          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
            Espacio A
            <select name="espacio_a" required className="input">
              {espacios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
            Espacio B
            <select name="espacio_b" required className="input">
              {espacios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
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
