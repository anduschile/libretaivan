import { startOfMonth, endOfMonth } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { getAsignacionesParaEstadisticas } from "@/lib/data/queries";
import { agruparPorEntidad, agruparPorRecinto } from "@/lib/estadisticas";
import { hoyISO, formatFechaISO, formatFechaCorta } from "@/lib/date";
import { RangoFechas } from "./rango-fechas";
import { DesgloseToggle } from "./desglose-toggle";
import { DesgloseLista } from "./desglose-lista";

export const dynamic = "force-dynamic";

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; desglose?: string }>;
}) {
  const params = await searchParams;
  const hoy = hoyISO();
  const hoyDate = new Date(`${hoy}T00:00:00`);

  let desde = params.desde || formatFechaISO(startOfMonth(hoyDate));
  let hasta = params.hasta || formatFechaISO(endOfMonth(hoyDate));
  // Si el usuario deja "hasta" antes que "desde" (o viceversa), se intercambian en
  // vez de devolver un rango inválido que traería cero filas sin explicar por qué.
  if (desde > hasta) [desde, hasta] = [hasta, desde];

  const desglose: "entidad" | "recinto" = params.desglose === "recinto" ? "recinto" : "entidad";

  const filas = await getAsignacionesParaEstadisticas(desde, hasta);
  const totalHoras = filas.length;
  const desglosado = desglose === "entidad" ? agruparPorEntidad(filas) : agruparPorRecinto(filas);

  return (
    <div className="pb-24">
      <PageHeader
        title="Estadísticas"
        subtitle={`${formatFechaCorta(desde)} — ${formatFechaCorta(hasta)} · ${totalHoras} hora${totalHoras === 1 ? "" : "s"} en total`}
      />

      <div className="flex flex-col gap-4 px-4 py-4 desktop:px-8">
        <RangoFechas desde={desde} hasta={hasta} />
        <DesgloseToggle desglose={desglose} />
      </div>

      <DesgloseLista
        filas={desglosado}
        etiquetaVacio={
          desglose === "entidad"
            ? "No hay asignaciones confirmadas de ninguna organización en este rango de fechas."
            : "No hay asignaciones confirmadas en ningún recinto en este rango de fechas."
        }
      />
    </div>
  );
}
