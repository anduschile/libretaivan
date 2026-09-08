"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { crearConvenio, type ConvenioFormState } from "./actions";
import { DIAS_SEMANA } from "@/lib/db/domain";
import type { RdEntidad, RdEspacio } from "@/lib/db/types";

const initialState: ConvenioFormState = { error: null };

export function ConvenioFormButton({ entidades, espacios }: { entidades: RdEntidad[]; espacios: RdEspacio[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(crearConvenio, initialState);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-sm font-medium text-white shadow-lg desktop:bottom-8 desktop:right-8"
      >
        <Plus size={18} />
        Nuevo convenio
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo convenio">
        {state.resumen ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-text)]">
              Se crearon <strong>{state.resumen.creadas}</strong> sesiones.
            </p>
            {state.resumen.pendientes.length > 0 && (
              <div className="rounded-xl bg-[var(--color-warning-soft)] p-3">
                <p className="mb-1 text-sm font-medium text-[var(--color-warning)]">
                  {state.resumen.pendientes.length} fecha(s) quedaron pendientes por conflicto:
                </p>
                <ul className="list-disc pl-4 text-sm text-[var(--color-text)]">
                  {state.resumen.pendientes.map((p) => (
                    <li key={p.fecha}>
                      {p.fecha} — {p.motivo}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Resuelve estas fechas manualmente desde Programación (negociando con la otra
                  entidad o eligiendo otro horario para ese día).
                </p>
              </div>
            )}
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                window.location.reload();
              }}
            >
              Listo
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <Field label="Organización">
              <select name="entidad_id" required className="input">
                <option value="" disabled>
                  Selecciona…
                </option>
                {entidades.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Espacio">
              <select name="espacio_id" required className="input">
                <option value="" disabled>
                  Selecciona…
                </option>
                {espacios.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset>
              <legend className="mb-1 text-sm font-medium text-[var(--color-text)]">Días de la semana</legend>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => (
                  <label
                    key={d.value}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm has-checked:border-[var(--color-accent)] has-checked:bg-[var(--color-accent-soft)] has-checked:text-[var(--color-accent)]"
                  >
                    <input type="checkbox" name="dias_semana" value={d.value} className="sr-only" />
                    {d.corto}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora inicio">
                <input name="hora_inicio" type="time" required className="input" />
              </Field>
              <Field label="Hora fin">
                <input name="hora_fin" type="time" required className="input" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vigente desde">
                <input name="vigencia_desde" type="date" required className="input" />
              </Field>
              <Field label="Vigente hasta (opcional)">
                <input name="vigencia_hasta" type="date" className="input" />
              </Field>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Si dejas &ldquo;hasta&rdquo; vacío, se generan sesiones para los próximos 90 días; puedes
              volver a generar más adelante.
            </p>

            <Field label="Documento de respaldo">
              <input name="documento_respaldo" placeholder="oficio, decreto, acta…" className="input" />
            </Field>

            <Field label="Observaciones">
              <textarea name="observaciones" rows={2} className="input" />
            </Field>

            {state.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}

            <Button type="submit" disabled={pending}>
              {pending ? "Generando sesiones…" : "Crear convenio y generar sesiones"}
            </Button>
          </form>
        )}
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
