import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatFechaCorta, sumarDias } from "@/lib/date";

export function DateStrip({
  dias,
  fechaActual,
  recintoId,
  vista,
  espacioId,
}: {
  dias: { fecha: string; count: number }[];
  fechaActual: string;
  recintoId: string;
  vista: "dia" | "semana";
  espacioId?: string;
}) {
  // En vista Día se navega de a un día; en Semana, de a una semana completa (7 días) para
  // saltar directo al bloque de fechas siguiente/anterior.
  const paso = vista === "semana" ? 7 : 1;

  function hrefPara(fecha: string): string {
    const params = new URLSearchParams({ recinto: recintoId, fecha, vista });
    if (espacioId) params.set("espacio", espacioId);
    return `/programacion?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-4 pb-3 desktop:px-8">
      <Link
        href={hrefPara(sumarDias(fechaActual, -paso))}
        aria-label={vista === "semana" ? "Semana anterior" : "Día anterior"}
        className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
      >
        <ChevronLeft size={18} />
      </Link>

      <div className="flex flex-1 gap-2 overflow-x-auto">
        {dias.map((d) => {
          const activo = d.fecha === fechaActual;
          return (
            <Link
              key={d.fecha}
              href={hrefPara(d.fecha)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs ${
                activo ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="font-medium">{formatFechaCorta(d.fecha)}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  d.count > 0 ? (activo ? "bg-[var(--color-accent)]" : "bg-[var(--color-text-muted)]") : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>

      <Link
        href={hrefPara(sumarDias(fechaActual, paso))}
        aria-label={vista === "semana" ? "Semana siguiente" : "Día siguiente"}
        className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
      >
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
