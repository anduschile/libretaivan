import Link from "next/link";
import { CalendarClock, PauseCircle, ShieldAlert, Clock, Gauge, Users, Bell } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getResumenHoy } from "@/lib/data/hoy";
import { formatFechaLarga } from "@/lib/date";
import { RECINTO_TIPO_LABEL, TIPO_COLOR_TEXTO } from "@/lib/db/domain";
import { RecintoTipoIcon } from "@/components/ui/tipo-icon";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const resumen = await getResumenHoy();

  return (
    <div>
      <PageHeader title="Hoy" subtitle={capitalizar(formatFechaLarga(resumen.fecha))} />

      <div className="grid grid-cols-2 gap-3 px-4 py-4 desktop:grid-cols-4 desktop:px-8">
        <Kpi icon={Clock} label="Bloques hoy" value={String(resumen.bloquesHoy)} />
        <Kpi icon={Gauge} label="Ocupación" value={`${resumen.ocupacionPorcentaje}%`} />
        <Kpi icon={Users} label="Organizaciones activas" value={String(resumen.organizacionesActivas)} />
        <Kpi
          icon={Bell}
          label="Alertas"
          value={String(resumen.alertas.length)}
          highlight={resumen.alertas.length > 0}
        />
      </div>

      <section className="px-4 desktop:px-8">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Requiere atención</h2>
        {resumen.alertas.length === 0 ? (
          <Card className="mb-6 text-sm text-[var(--color-text-muted)]">
            No hay alertas pendientes por ahora.
          </Card>
        ) : (
          <div className="mb-6 flex flex-col gap-2">
            {resumen.alertas.map((a, i) => (
              <AlertaCard key={i} alerta={a} />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 pb-6 desktop:px-8">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Estado por recinto</h2>
        <div className="flex flex-col gap-2">
          {resumen.porRecinto.map(({ recinto, bloquesHoy, tieneBloqueo }) => {
            return (
              <Link key={recinto.id} href={`/programacion?recinto=${recinto.id}`}>
                <Card className="flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <RecintoTipoIcon tipo={recinto.tipo} size={18} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{recinto.nombre}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {RECINTO_TIPO_LABEL[recinto.tipo]} · {bloquesHoy} bloque{bloquesHoy === 1 ? "" : "s"} hoy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tieneBloqueo && <Badge variant="warning">Bloqueado</Badge>}
                    {recinto.estado !== "operativo" && (
                      <Badge variant="danger">{recinto.estado === "mantencion" ? "Mantención" : "Cerrado"}</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-l-4 border-l-[var(--color-danger)]" : undefined}>
      <div
        className={`flex items-center gap-1.5 ${
          highlight ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
        }`}
      >
        <Icon size={14} />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{value}</p>
    </Card>
  );
}

function AlertaCard({ alerta }: { alerta: Awaited<ReturnType<typeof getResumenHoy>>["alertas"][number] }) {
  if (alerta.tipo === "bloqueo") {
    return (
      <Card borderColorClass="border-l-gray-400" className="flex items-start gap-3">
        <PauseCircle size={18} className={`mt-0.5 shrink-0 ${TIPO_COLOR_TEXTO.bloqueo}`} />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">
            Bloqueo — {alerta.recintoNombre ?? alerta.espacioNombre}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {alerta.bloqueo.motivo} · {alerta.bloqueo.descripcion ?? "sin descripción"} · hasta{" "}
            {alerta.bloqueo.fecha_hasta}
          </p>
        </div>
      </Card>
    );
  }

  if (alerta.tipo === "uso_sin_registrar") {
    return (
      <Card borderColorClass="border-l-amber-500" className="flex items-start gap-3">
        <CalendarClock size={18} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">
            Falta registrar uso — {alerta.entidadNombre}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {alerta.espacioNombre} · {alerta.fecha}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card borderColorClass="border-l-[var(--color-danger)]" className="flex items-start gap-3">
      <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">
          Directiva vencida — {alerta.entidadNombre}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Vencida desde {alerta.vigenciaDirectiva} · tiene actividad hoy
        </p>
      </div>
    </Card>
  );
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
