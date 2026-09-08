import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecinto, getEspacios, getHorarios, getEspacioConflictos } from "@/lib/data/queries";
import { RECINTO_TIPO_LABEL, DIAS_SEMANA } from "@/lib/db/domain";
import { RecintoTipoIcon, EspacioTipoIcon } from "@/components/ui/tipo-icon";
import { RecintoFormButton } from "../recinto-form";
import { EspacioFormButton } from "../espacio-form";
import { HorarioFormButton } from "../horario-form";
import { ConflictoFormButton } from "../conflicto-form";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { eliminarHorario, eliminarConflicto } from "../actions";

export const dynamic = "force-dynamic";

export default async function RecintoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recinto, espacios, conflictos] = await Promise.all([
    getRecinto(id),
    getEspacios(id),
    getEspacioConflictos(),
  ]);

  if (!recinto) notFound();

  // Se pide después de tener los espacios: las filas de horario por espacio tienen
  // `recinto_id = null`, así que hace falta la lista de ids de espacio para traerlas.
  const horarios = await getHorarios(id, espacios.map((e) => e.id));

  const espacioIds = new Set(espacios.map((e) => e.id));
  const conflictosDelRecinto = conflictos.filter(
    (c) => espacioIds.has(c.espacio_a) && espacioIds.has(c.espacio_b)
  );
  const nombrePorEspacio = new Map(espacios.map((e) => [e.id, e.nombre]));

  const horariosRecinto = horarios.filter((h) => h.recinto_id === recinto.id && !h.espacio_id);
  const horariosPorEspacio = new Map<string, typeof horarios>();
  for (const h of horarios) {
    if (!h.espacio_id) continue;
    horariosPorEspacio.set(h.espacio_id, [...(horariosPorEspacio.get(h.espacio_id) ?? []), h]);
  }

  return (
    <div className="pb-24">
      <PageHeader
        backHref="/recintos"
        title={recinto.nombre}
        subtitle={RECINTO_TIPO_LABEL[recinto.tipo]}
        action={<RecintoFormButton recinto={recinto} />}
      />

      <div className="flex flex-col gap-6 px-4 py-4 desktop:px-8">
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
            <RecintoTipoIcon tipo={recinto.tipo} size={18} />
            {RECINTO_TIPO_LABEL[recinto.tipo]}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={recinto.propiedad === "cedido" ? "warning" : "neutral"}>
              {recinto.propiedad === "cedido" ? `Cedido${recinto.titular ? ` · ${recinto.titular}` : ""}` : "Propio"}
            </Badge>
            <Badge variant={recinto.estado === "operativo" ? "accent" : "danger"}>
              {recinto.estado === "operativo" ? "Operativo" : recinto.estado === "mantencion" ? "Mantención" : "Cerrado"}
            </Badge>
          </div>
          {recinto.direccion && (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{recinto.direccion}</p>
          )}
        </Card>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Espacios</h2>
            <EspacioFormButton recintoId={recinto.id} />
          </div>
          <div className="flex flex-col gap-2">
            {espacios.map((e) => {
              return (
                <Card key={e.id} className="flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <EspacioTipoIcon tipo={e.tipo} size={16} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{e.nombre}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {e.tipo ?? "sin tipo"}
                        {e.actividad_fija && ` · uso preferente: ${e.actividad_fija}`}
                        {!e.activo && " · inactivo"}
                      </p>
                    </div>
                  </div>
                  <EspacioFormButton recintoId={recinto.id} espacio={e} />
                </Card>
              );
            })}
            {espacios.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">Este recinto todavía no tiene espacios.</p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Horario de operación</h2>
            <HorarioFormButton recintoId={recinto.id} espacios={espacios} />
          </div>
          <div className="flex flex-col gap-2">
            {horariosRecinto.map((h) => (
              <HorarioRow key={h.id} horario={h} recintoId={recinto.id} etiqueta={h.espacio_id ? undefined : "Todo el recinto"} />
            ))}
            {[...horariosPorEspacio.entries()].map(([espacioId, hs]) =>
              hs.map((h) => (
                <HorarioRow
                  key={h.id}
                  horario={h}
                  recintoId={recinto.id}
                  etiqueta={nombrePorEspacio.get(espacioId)}
                />
              ))
            )}
            {horarios.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">Sin horario de operación definido.</p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Espacios mutuamente excluyentes</h2>
            <ConflictoFormButton recintoId={recinto.id} espacios={espacios} />
          </div>
          <div className="flex flex-col gap-2">
            {conflictosDelRecinto.map((c) => (
              <Card key={`${c.espacio_a}-${c.espacio_b}`} className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text)]">
                  {nombrePorEspacio.get(c.espacio_a)} ↔ {nombrePorEspacio.get(c.espacio_b)}
                </p>
                <DeleteIconButton
                  action={eliminarConflicto.bind(null, recinto.id, c.espacio_a, c.espacio_b)}
                  confirmMessage="¿Quitar esta restricción entre espacios?"
                />
              </Card>
            ))}
            {conflictosDelRecinto.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                No hay espacios marcados como mutuamente excluyentes en este recinto.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function HorarioRow({
  horario,
  recintoId,
  etiqueta,
}: {
  horario: {
    id: string;
    dia_semana: number;
    hora_apertura: string;
    hora_cierre: string;
    etiqueta: string | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
  };
  recintoId: string;
  etiqueta?: string;
}) {
  const dia = DIAS_SEMANA.find((d) => d.value === horario.dia_semana)?.label ?? horario.dia_semana;
  const sinFechas = !horario.vigencia_desde && !horario.vigencia_hasta;
  const esInvierno = horario.etiqueta === "invierno";

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[var(--color-text)]">
          {dia} · {horario.hora_apertura.slice(0, 5)}–{horario.hora_cierre.slice(0, 5)}
          {etiqueta && <span className="text-[var(--color-text-muted)]"> · {etiqueta}</span>}
        </p>
        {horario.etiqueta && horario.etiqueta !== "normal" && (
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant={esInvierno && sinFechas ? "warning" : "neutral"}>{horario.etiqueta}</Badge>
            {esInvierno && sinFechas && (
              <span className="text-xs text-[var(--color-warning)]">fechas pendientes de confirmar</span>
            )}
          </div>
        )}
      </div>
      <DeleteIconButton
        action={eliminarHorario.bind(null, recintoId, horario.id)}
        confirmMessage="¿Eliminar este horario?"
      />
    </Card>
  );
}
