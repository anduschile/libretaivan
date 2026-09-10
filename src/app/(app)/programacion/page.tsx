import { PageHeader } from "@/components/ui/page-header";
import {
  getRecintos,
  getEspacios,
  getEntidades,
  getAsignacionesEntreFechas,
  getHorarios,
  getBloqueosEntreFechas,
  getEspacioConflictos,
} from "@/lib/data/queries";
import { hoyISO, rangoSemana, formatFechaLarga, formatFechaCorta, diaSemanaISOFromDate } from "@/lib/date";
import { calcularDisponibilidad } from "@/lib/disponibilidad";
import { RecintoPicker } from "./recinto-picker";
import { VistaToggle } from "./vista-toggle";
import { DateStrip } from "./date-strip";
import { EspacioSelectorSemana } from "./espacio-selector-semana";
import { ProgramacionInteractive } from "./programacion-interactive";
import { ExportButtons } from "./export-buttons";

export const dynamic = "force-dynamic";

export default async function ProgramacionPage({
  searchParams,
}: {
  searchParams: Promise<{ recinto?: string; fecha?: string; vista?: string; espacio?: string }>;
}) {
  const params = await searchParams;
  const recintos = await getRecintos();
  const recintoId = params.recinto ?? recintos[0]?.id ?? "";
  const fecha = params.fecha ?? hoyISO();
  // Por defecto abre en Semana (mejor panorama general, sobre todo en el celular) —
  // el toggle Día/Semana sigue disponible para cambiar. Un ?vista=dia explícito en la
  // URL mantiene la vista de Día (ej. al volver de un enlace que ya la fijó).
  const vista: "dia" | "semana" = params.vista === "dia" ? "dia" : "semana";

  const [espacios, entidades, conflictos] = await Promise.all([
    getEspacios(),
    getEntidades(),
    getEspacioConflictos(),
  ]);
  const espaciosDelRecinto = espacios.filter((e) => e.recinto_id === recintoId);
  const espacioIds = espaciosDelRecinto.map((e) => e.id);

  const { dias } = rangoSemana(fecha);
  const asignacionesSemanaRecinto = await getAsignacionesEntreFechas(dias[0], dias[6], espacioIds);
  const conteoPorDia = dias.map((d) => ({
    fecha: d,
    count: asignacionesSemanaRecinto.filter((a) => a.fecha === d).length,
  }));

  const espacioSemanaId =
    vista === "semana"
      ? espaciosDelRecinto.some((e) => e.id === params.espacio)
        ? params.espacio!
        : (espaciosDelRecinto[0]?.id ?? "")
      : undefined;

  let subtitulo: string;
  let cuerpo: React.ReactNode;

  if (recintos.length === 0) {
    subtitulo = "";
    cuerpo = (
      <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">
        Todavía no hay recintos registrados. Créalos primero en la pestaña Recintos.
      </p>
    );
  } else if (vista === "dia") {
    const fechaPasada = fecha < hoyISO();
    const diaSemana = diaSemanaISOFromDate(fecha);

    const [horariosRecinto, bloqueosDia] = await Promise.all([
      getHorarios(recintoId, espacioIds),
      getBloqueosEntreFechas(fecha, fecha),
    ]);

    const asignacionesDelDia = asignacionesSemanaRecinto.filter((a) => a.fecha === fecha);
    const bloqueosDelRecinto = bloqueosDia.filter(
      (b) => b.recinto_id === recintoId || espacioIds.includes(b.espacio_id ?? "")
    );
    const horariosDelDia = horariosRecinto.filter((h) => h.dia_semana === diaSemana && h.etiqueta === "normal");

    const bloqueosPorEspacio = new Map<string, typeof bloqueosDelRecinto>();
    for (const b of bloqueosDelRecinto) {
      const idsAfectados = b.espacio_id ? [b.espacio_id] : b.recinto_id === recintoId ? espacioIds : [];
      for (const id of idsAfectados) {
        bloqueosPorEspacio.set(id, [...(bloqueosPorEspacio.get(id) ?? []), b]);
      }
    }

    const disponibilidad = Object.fromEntries(
      calcularDisponibilidad({
        espacios: espaciosDelRecinto,
        horarios: horariosDelDia,
        ocupadas: asignacionesDelDia,
        bloqueosPorEspacio,
      })
    );

    subtitulo = capitalizar(formatFechaLarga(fecha));
    cuerpo = (
      <ProgramacionInteractive
        recintos={recintos}
        espacios={espacios}
        entidades={entidades}
        recintoId={recintoId}
        fecha={fecha}
        vistaProps={{
          vista: "dia",
          espaciosDelRecinto,
          asignaciones: asignacionesDelDia,
          bloqueos: bloqueosDelRecinto,
          conflictos,
          disponibilidad,
          fechaPasada,
        }}
      />
    );
  } else {
    // Espacios "hermanos" del espacio seleccionado (ej. las transversales de la cancha
    // principal): sus asignaciones se traen aparte para poder mostrar el espacio actual
    // como "ocupado — cancha dividida" cuando corresponda (ver bloque-grid.tsx / item 2).
    const relacionadosIds = conflictos
      .filter((c) => c.espacio_a === espacioSemanaId || c.espacio_b === espacioSemanaId)
      .map((c) => (c.espacio_a === espacioSemanaId ? c.espacio_b : c.espacio_a));

    const [asignacionesSemanaEspacio, asignacionesEspejo, bloqueosSemana] = await Promise.all([
      getAsignacionesEntreFechas(dias[0], dias[6], espacioSemanaId ? [espacioSemanaId] : []),
      getAsignacionesEntreFechas(dias[0], dias[6], relacionadosIds),
      getBloqueosEntreFechas(dias[0], dias[6]),
    ]);
    const bloqueosDelEspacio = bloqueosSemana.filter(
      (b) => b.espacio_id === espacioSemanaId || (!b.espacio_id && b.recinto_id === recintoId)
    );

    subtitulo = `Semana del ${formatFechaCorta(dias[0])} al ${formatFechaCorta(dias[6])}`;
    cuerpo = espacioSemanaId ? (
      <>
        <EspacioSelectorSemana espacios={espaciosDelRecinto} espacioId={espacioSemanaId} />
        <ProgramacionInteractive
          recintos={recintos}
          espacios={espacios}
          entidades={entidades}
          recintoId={recintoId}
          fecha={fecha}
          vistaProps={{
            vista: "semana",
            dias,
            espacioSemanaId,
            asignaciones: asignacionesSemanaEspacio,
            asignacionesEspejo,
            bloqueos: bloqueosDelEspacio,
          }}
        />
      </>
    ) : (
      <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">
        Este recinto todavía no tiene espacios.
      </p>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Programación" subtitle={subtitulo} />

      {recintos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 desktop:px-8">
            <RecintoPicker recintos={recintos} recintoId={recintoId} />
            <VistaToggle vista={vista} />
          </div>
          <DateStrip
            dias={conteoPorDia}
            fechaActual={fecha}
            recintoId={recintoId}
            vista={vista}
            espacioId={espacioSemanaId}
          />
        </>
      )}

      {cuerpo}

      {recintos.length > 0 && vista === "dia" && <ExportButtons recintoId={recintoId} fecha={fecha} />}
    </div>
  );
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
