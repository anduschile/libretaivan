"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { formatFechaISO, formatFechaCorta, hoyISO } from "@/lib/date";

const DIAS_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];

type Atajo = { etiqueta: string; calcular: () => { desde: string; hasta: string } };

function construirAtajos(): Atajo[] {
  const hoy = new Date(`${hoyISO()}T00:00:00`);
  return [
    {
      etiqueta: "Últimos 7 días",
      calcular: () => ({ desde: formatFechaISO(addDays(hoy, -6)), hasta: formatFechaISO(hoy) }),
    },
    {
      etiqueta: "Esta semana",
      calcular: () => ({
        desde: formatFechaISO(startOfWeek(hoy, { weekStartsOn: 1 })),
        hasta: formatFechaISO(endOfWeek(hoy, { weekStartsOn: 1 })),
      }),
    },
    {
      etiqueta: "Este mes",
      calcular: () => ({ desde: formatFechaISO(startOfMonth(hoy)), hasta: formatFechaISO(endOfMonth(hoy)) }),
    },
    {
      etiqueta: "Mes anterior",
      calcular: () => {
        const mesAnterior = subMonths(hoy, 1);
        return { desde: formatFechaISO(startOfMonth(mesAnterior)), hasta: formatFechaISO(endOfMonth(mesAnterior)) };
      },
    },
    {
      etiqueta: "Este año",
      calcular: () => ({ desde: formatFechaISO(startOfYear(hoy)), hasta: formatFechaISO(endOfYear(hoy)) }),
    },
  ];
}

export function RangoFechas({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mesVisible, setMesVisible] = useState(startOfMonth(parseISO(desde)));
  // Mientras es distinto de null, el usuario ya eligió el primer extremo del
  // rango y está por elegir el segundo (con un solo clic cada vez, en el mismo
  // calendario, en vez de dos campos "Desde"/"Hasta" separados).
  const [inicioPendiente, setInicioPendiente] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    containerRef,
    () => {
      setOpen(false);
      setInicioPendiente(null);
    },
    open,
  );

  function aplicar(nuevoDesde: string, nuevoHasta: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("desde", nuevoDesde);
    params.set("hasta", nuevoHasta);
    router.push(`/estadisticas?${params.toString()}`);
    setInicioPendiente(null);
    setOpen(false);
  }

  function clicDia(diaISO: string) {
    if (!inicioPendiente) {
      setInicioPendiente(diaISO);
      return;
    }
    const [d, h] = diaISO < inicioPendiente ? [diaISO, inicioPendiente] : [inicioPendiente, diaISO];
    aplicar(d, h);
  }

  const inicioGrilla = startOfWeek(startOfMonth(mesVisible), { weekStartsOn: 1 });
  const finGrilla = endOfWeek(endOfMonth(mesVisible), { weekStartsOn: 1 });
  const dias: Date[] = [];
  for (let d = inicioGrilla; d <= finGrilla; d = addDays(d, 1)) dias.push(d);

  // Mientras se está eligiendo el segundo extremo solo se resalta el primero ya
  // elegido (todavía no hay un rango que mostrar); el rango completo vuelve a
  // verse recién cuando ambos extremos vienen confirmados desde la URL.
  const rangoDesde = inicioPendiente ?? desde;
  const rangoHasta = inicioPendiente ?? hasta;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setMesVisible(startOfMonth(parseISO(desde)));
          setInicioPendiente(null);
          setOpen((o) => !o);
        }}
        className="input flex w-fit items-center gap-2 text-left"
      >
        <CalendarRange size={16} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="capitalize">
          {formatFechaCorta(desde)} — {formatFechaCorta(hasta)}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 flex w-[min(92vw,32rem)] flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg desktop:w-auto desktop:flex-row">
          <div className="flex flex-row flex-wrap gap-2 desktop:w-36 desktop:flex-col desktop:flex-nowrap desktop:border-r desktop:border-[var(--color-border)] desktop:pr-3">
            {construirAtajos().map((atajo) => (
              <button
                key={atajo.etiqueta}
                type="button"
                onClick={() => aplicar(atajo.calcular().desde, atajo.calcular().hasta)}
                className="rounded-full bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] desktop:rounded-xl desktop:px-3 desktop:py-2 desktop:text-left desktop:text-sm"
              >
                {atajo.etiqueta}
              </button>
            ))}
          </div>

          <div className="w-full desktop:w-72">
            <p className="mb-2 h-4 text-xs text-[var(--color-text-muted)]">
              {inicioPendiente
                ? `Elige la fecha de término (inicio: ${formatFechaCorta(inicioPendiente)})`
                : "Elige la fecha de inicio"}
            </p>
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

            <div className="grid grid-cols-7 text-center text-[11px] text-[var(--color-text-muted)]">
              {DIAS_CORTOS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {dias.map((dia) => {
                const diaISO = formatFechaISO(dia);
                const enMes = isSameMonth(dia, mesVisible);
                const esInicio = diaISO === rangoDesde;
                const esFin = diaISO === rangoHasta;
                const enRango = diaISO > rangoDesde && diaISO < rangoHasta;
                return (
                  <div
                    key={dia.toISOString()}
                    className={`flex justify-center py-0.5 ${enRango || esInicio || esFin ? "bg-[var(--color-accent-soft)]" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => clicDia(diaISO)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        esInicio || esFin
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
