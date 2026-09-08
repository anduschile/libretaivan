import Link from "next/link";
import { formatFechaCorta } from "@/lib/date";

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
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-border)] px-4 pb-3 desktop:px-8">
      {dias.map((d) => {
        const activo = d.fecha === fechaActual;
        const params = new URLSearchParams({ recinto: recintoId, fecha: d.fecha, vista });
        if (espacioId) params.set("espacio", espacioId);
        return (
          <Link
            key={d.fecha}
            href={`/programacion?${params.toString()}`}
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
  );
}
