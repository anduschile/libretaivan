"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { useClickOutside } from "@/lib/hooks/use-click-outside";

// Las asignaciones del negocio son siempre en bloques de hora completa: la lista
// desplegable solo ofrece horas en punto. Quien necesite un horario distinto (caso
// excepcional) puede escribirlo directo en el campo de texto de arriba.
const PASO_MINUTOS = 60;
const DESDE_MIN = 7 * 60;
const HASTA_MIN = 23 * 60;

function generarOpciones(): string[] {
  const opciones: string[] = [];
  for (let m = DESDE_MIN; m <= HASTA_MIN; m += PASO_MINUTOS) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const min = String(m % 60).padStart(2, "0");
    opciones.push(`${h}:${min}`);
  }
  return opciones;
}

const OPCIONES = generarOpciones();

export function TimeField({
  name,
  value,
  onChange,
  required,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const seleccionado = listRef.current.querySelector('[data-selected="true"]');
    seleccionado?.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span>{value || "--:--"}</span>
        <Clock size={16} className="shrink-0 text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg">
          <div className="mb-1.5 flex items-center gap-1.5 border-b border-[var(--color-border)] px-1 pb-1.5">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Hora exacta (HH:mm)"
              defaultValue={value}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (/^\d{1,2}:\d{2}$/.test(v)) {
                  const [h, m] = v.split(":");
                  onChange(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
                }
              }}
              className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div ref={listRef} className="max-h-52 overflow-y-auto pr-1">
            {OPCIONES.map((hora) => {
              const seleccionado = hora === value;
              return (
                <button
                  key={hora}
                  type="button"
                  data-selected={seleccionado}
                  onClick={() => {
                    onChange(hora);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                    seleccionado
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {hora}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
