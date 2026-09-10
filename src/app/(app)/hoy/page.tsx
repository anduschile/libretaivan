import Link from "next/link";
import { Building2, Clock, PauseCircle, AlertTriangle, BarChart3, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getResumenHoy } from "@/lib/data/hoy";
import { getRecintos, getEspacios, getEntidades } from "@/lib/data/queries";
import { formatFechaLarga } from "@/lib/date";
import { BLOQUEO_MOTIVO_LABEL } from "@/lib/db/domain";
import { AgendaHoy } from "./agenda-hoy";
import { AccesoDirectoAsignar } from "./acceso-directo";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const [resumen, recintos, espacios, entidades] = await Promise.all([
    getResumenHoy(),
    getRecintos(),
    getEspacios(),
    getEntidades(),
  ]);

  const hayAlertas = resumen.esFeriado || resumen.bloqueos.length > 0;

  return (
    <div className="pb-24">
      <PageHeader title="Hoy" subtitle={capitalizar(formatFechaLarga(resumen.fecha))} />

      <div className="grid grid-cols-2 gap-3 px-4 py-4 desktop:px-8">
        <Kpi
          icon={Clock}
          label="Horas ocupadas hoy"
          value={`${resumen.horasOcupadas} / ${resumen.horasFuncionamiento}`}
        />
        <Kpi
          icon={Building2}
          label="Recintos activos hoy"
          value={`${resumen.recintosActivos} / ${resumen.totalRecintos}`}
        />
      </div>

      {hayAlertas && (
        <section className="px-4 pb-4 desktop:px-8">
          <div className="flex flex-col gap-2">
            {resumen.esFeriado ? (
              <Card borderColorClass="border-l-[var(--color-danger)]" className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Hoy es feriado irrenunciable — todos los recintos cerrados.
                </p>
              </Card>
            ) : (
              resumen.bloqueos.map((b) => (
                <Card key={b.id} borderColorClass="border-l-gray-400" className="flex items-start gap-3">
                  <PauseCircle size={18} className="mt-0.5 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {BLOQUEO_MOTIVO_LABEL[b.motivo]} — {b.recintoNombre}
                      {b.espacioNombres.length > 0 && ` (${b.espacioNombres.join(", ")})`}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {b.horaInicio && b.horaFin ? `${b.horaInicio.slice(0, 5)}–${b.horaFin.slice(0, 5)}` : "Todo el día"}
                      {b.descripcion && ` · ${b.descripcion}`}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      )}

      {resumen.ranking.length > 0 && (
        <section className="px-4 pb-6 desktop:px-8">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
            <BarChart3 size={16} className="text-[var(--color-text-muted)]" />
            Recintos con más movimiento hoy
          </h2>
          <Card className="flex flex-col gap-1">
            {resumen.ranking.map((r) => (
              <Link
                key={r.id}
                href={`/programacion?recinto=${r.id}&vista=dia&fecha=${resumen.fecha}`}
                className="-mx-1 flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 hover:bg-[var(--color-bg)]"
              >
                <span className="truncate text-sm text-[var(--color-text)]">{r.nombre}</span>
                <span className="shrink-0 text-sm font-medium text-[var(--color-text-muted)]">
                  {r.horas} hora{r.horas === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <section className="pb-6">
        <h2 className="mb-2 flex items-center gap-1.5 px-4 text-sm font-semibold text-[var(--color-text)] desktop:px-8">
          <CalendarClock size={16} className="text-[var(--color-text-muted)]" />
          Agenda del día
        </h2>
        <AgendaHoy items={resumen.agenda} fecha={resumen.fecha} />
      </section>

      <AccesoDirectoAsignar recintos={recintos} espacios={espacios} entidades={entidades} fecha={resumen.fecha} />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
        <Icon size={14} />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{value}</p>
    </Card>
  );
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
