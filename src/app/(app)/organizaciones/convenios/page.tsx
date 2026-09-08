import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getConvenios, getEntidades, getEspacios } from "@/lib/data/queries";
import { DIAS_SEMANA, esConvenioIncompleto, motivoIncompleto } from "@/lib/db/domain";
import { horaCorta } from "@/lib/date";
import { OrganizacionesTabs } from "../tabs";
import { ConvenioFormButton } from "./convenio-form";
import { EstadoConvenioSelect } from "./estado-select";

export const dynamic = "force-dynamic";

export default async function ConveniosPage() {
  const [convenios, entidades, espacios] = await Promise.all([getConvenios(), getEntidades(), getEspacios()]);
  const nombreEntidad = new Map(entidades.map((e) => [e.id, e.nombre]));
  const nombreEspacio = new Map(espacios.map((e) => [e.id, e.nombre]));

  return (
    <div>
      <PageHeader title="Organizaciones" subtitle={`${convenios.length} convenios`} />
      <OrganizacionesTabs />

      <div className="flex flex-col gap-3 px-4 py-4 desktop:px-8">
        {convenios.map((c) => {
          const incompleto = esConvenioIncompleto(c);
          return (
            <Card
              key={c.id}
              borderColorClass={incompleto ? "border-l-[var(--color-warning)]" : undefined}
              className="flex items-start justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {nombreEntidad.get(c.entidad_id) ?? "—"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {nombreEspacio.get(c.espacio_id) ?? "—"} ·{" "}
                  {c.dias_semana
                    .map((d) => DIAS_SEMANA.find((ds) => ds.value === d)?.corto)
                    .join(", ")}{" "}
                  · {horaCorta(c.hora_inicio)}–{horaCorta(c.hora_fin)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Desde {c.vigencia_desde}
                  {c.vigencia_hasta ? ` hasta ${c.vigencia_hasta}` : " · sin fecha de término"}
                </p>
                {incompleto && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--color-warning)]">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {motivoIncompleto(c)}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {incompleto ? (
                  <Badge variant="warning">Incompleto</Badge>
                ) : (
                  <Badge variant={c.estado === "activo" ? "accent" : c.estado === "suspendido" ? "warning" : "neutral"}>
                    {c.estado}
                  </Badge>
                )}
                <EstadoConvenioSelect convenioId={c.id} estado={c.estado} />
              </div>
            </Card>
          );
        })}
        {convenios.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay convenios registrados.</p>
        )}
      </div>

      <ConvenioFormButton entidades={entidades} espacios={espacios} />
    </div>
  );
}
