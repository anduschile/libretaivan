"use client";

import { useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useClickOutside } from "@/lib/hooks/use-click-outside";

const DIAS_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];

export function DateField({
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
  const seleccionada = value ? parseISO(value) : new Date();
  const [mesVisible, setMesVisible] = useState(startOfMonth(seleccionada));
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const inicioGrilla = startOfWeek(startOfMonth(mesVisible), { weekStartsOn: 1 });
  const finGrilla = endOfWeek(endOfMonth(mesVisible), { weekStartsOn: 1 });
  const dias: Date[] = [];
  for (let d = inicioGrilla; d <= finGrilla; d = addDays(d, 1)) dias.push(d);

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        type="button"
        onClick={() => {
          setMesVisible(startOfMonth(seleccionada));
          setOpen((o) => !o);
        }}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="capitalize">
          {value ? format(seleccionada, "EEE d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}
        </span>
        <CalendarDays size={16} className="shrink-0 text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMesVisible((m) => subMonths(m, 1))}
              className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-medium capitalize text-[var(--color-text)]">
              {format(mesVisible, "MMMM yyyy", { locale: es })}
            </p>
            <button
              type="button"
              onClick={() => setMesVisible((m) => addMonths(m, 1))}
              className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-text-muted)]">
            {DIAS_CORTOS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {dias.map((dia) => {
              const enMes = isSameMonth(dia, mesVisible);
              const esSeleccionado = value && isSameDay(dia, seleccionada);
              return (
                <button
                  key={dia.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(format(dia, "yyyy-MM-dd"));
                    setOpen(false);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    esSeleccionado
                      ? "bg-[var(--color-accent)] text-white"
                      : isToday(dia)
                        ? "border border-[var(--color-accent)] text-[var(--color-accent)]"
                        : enMes
                          ? "text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                          : "text-[var(--color-text-muted)]/40 hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {format(dia, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
