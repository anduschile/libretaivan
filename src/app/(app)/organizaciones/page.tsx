import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEntidades, getConvenios } from "@/lib/data/queries";
import { ENTIDAD_TIPO_LABEL, colorBordeEntidad } from "@/lib/db/domain";
import { minutosEntre, hoyISO } from "@/lib/date";
import { EntidadFormButton } from "./entidad-form";
import { OrganizacionesTabs } from "./tabs";

export const dynamic = "force-dynamic";

export default async function OrganizacionesPage() {
  const [entidades, convenios] = await Promise.all([getEntidades(), getConvenios()]);
  const hoy = hoyISO();

  const horasActivasPorEntidad = new Map<string, number>();
  for (const c of convenios) {
    if (c.estado !== "activo") continue;
    const minutos = minutosEntre(c.hora_inicio, c.hora_fin) * c.dias_semana.length;
    horasActivasPorEntidad.set(c.entidad_id, (horasActivasPorEntidad.get(c.entidad_id) ?? 0) + minutos / 60);
  }

  return (
    <div>
      <PageHeader title="Organizaciones" subtitle={`${entidades.length} registradas`} />
      <OrganizacionesTabs />

      <div className="flex flex-col gap-3 px-4 py-4 desktop:px-8">
        {entidades.map((e) => {
          const directivaVencida = e.vigencia_directiva !== null && e.vigencia_directiva < hoy;
          const horas = horasActivasPorEntidad.get(e.id) ?? 0;
          return (
            <Card key={e.id} borderColorClass={colorBordeEntidad(e.tipo)} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{e.nombre}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {ENTIDAD_TIPO_LABEL[e.tipo]}
                  {horas > 0 && ` · ${horas.toFixed(1)} h/semana en convenio`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {!e.activa && <Badge variant="neutral">Inactiva</Badge>}
                  {directivaVencida && <Badge variant="danger">Directiva vencida</Badge>}
                </div>
              </div>
              <EntidadFormButton entidad={e} />
            </Card>
          );
        })}
        {entidades.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Todavía no hay organizaciones cargadas. Usa el botón &ldquo;Nueva organización&rdquo; para
            comenzar.
          </p>
        )}
      </div>

      <EntidadFormButton />
    </div>
  );
}
