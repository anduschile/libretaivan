"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { guardarHorario, type FormState } from "./actions";
import { DIAS_SEMANA } from "@/lib/db/domain";
import type { RdEspacio } from "@/lib/db/types";

const initialState: FormState = { error: null };

export function HorarioFormButton({ recintoId, espacios }: { recintoId: string; espacios: RdEspacio[] }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useFormAction(guardarHorario, initialState, () => setOpen(false));

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Agregar horario
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo horario de operación">
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="recinto_id" value={recintoId} />

          <Field label="Aplica a">
            <select name="espacio_id" defaultValue="" className="input">
              <option value="">Todo el recinto</option>
              {espacios.map((e) => (
                <option key={e.id} value={e.id}>
                  Solo {e.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Día de la semana">
            <select name="dia_semana" required className="input">
              {DIAS_SEMANA.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Apertura">
              <input name="hora_apertura" type="time" required className="input" />
            </Field>
            <Field label="Cierre">
              <input name="hora_cierre" type="time" required className="input" />
            </Field>
          </div>

          <Field label="Etiqueta">
            <input
              name="etiqueta"
              defaultValue="normal"
              placeholder="normal, invierno, ventana_convenio…"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vigente desde (opcional)">
              <input name="vigencia_desde" type="date" className="input" />
            </Field>
            <Field label="Vigente hasta (opcional)">
              <input name="vigencia_hasta" type="date" className="input" />
            </Field>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Si dejas las fechas de vigencia vacías, el horario se considera permanente.
          </p>

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
