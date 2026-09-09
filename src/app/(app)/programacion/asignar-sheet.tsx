"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { TimeField } from "@/components/ui/time-field";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { esFeriadoIrrenunciable } from "@/lib/date";
import { crearAsignacion, actualizarAsignacion, cancelarAsignacion, type FormState } from "./actions";
import type { RdEntidad, RdEspacio, RdRecinto } from "@/lib/db/types";

const initialState: FormState = { error: null };

export type AsignarPrefill = {
  recintoId?: string;
  espacioId?: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  // Presentes solo en modo edición (clic sobre un bloque ya asignado).
  asignacionId?: string;
  entidadId?: string;
  actividad?: string;
  participantesEstimados?: number | null;
  documentoRespaldo?: string | null;
};

type ConflictoDetalle = {
  espacioNombre: string;
  entidadNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  relacionado: boolean;
};

export function AsignarSheet({
  open,
  onClose,
  recintos,
  espacios,
  entidades,
  recintoActual,
  fechaActual,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  recintos: RdRecinto[];
  espacios: RdEspacio[];
  entidades: RdEntidad[];
  recintoActual: string;
  fechaActual: string;
  prefill?: AsignarPrefill;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={prefill?.asignacionId ? "Editar asignación" : "Asignar horario"}>
      {/* Se monta solo mientras está abierta: cada apertura arranca con estado limpio
          (a partir de `prefill`) sin necesitar un efecto para resetear campos. */}
      {open && (
        <AsignarSheetForm
          recintos={recintos}
          espacios={espacios}
          entidades={entidades}
          recintoActual={recintoActual}
          fechaActual={fechaActual}
          prefill={prefill}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}

function AsignarSheetForm({
  recintos,
  espacios,
  entidades,
  recintoActual,
  fechaActual,
  prefill,
  onDone,
}: {
  recintos: RdRecinto[];
  espacios: RdEspacio[];
  entidades: RdEntidad[];
  recintoActual: string;
  fechaActual: string;
  prefill?: AsignarPrefill;
  onDone: () => void;
}) {
  const [recintoId, setRecintoId] = useState(prefill?.recintoId ?? recintoActual ?? recintos[0]?.id ?? "");
  const espaciosDelRecinto = useMemo(
    () => espacios.filter((e) => e.recinto_id === recintoId),
    [espacios, recintoId]
  );

  const [recintoIdAnterior, setRecintoIdAnterior] = useState(recintoId);
  const [espacioId, setEspacioId] = useState(prefill?.espacioId ?? espaciosDelRecinto[0]?.id ?? "");
  if (recintoId !== recintoIdAnterior) {
    setRecintoIdAnterior(recintoId);
    setEspacioId(espaciosDelRecinto[0]?.id ?? "");
  }

  const editando = Boolean(prefill?.asignacionId);

  const [entidadId, setEntidadId] = useState(prefill?.entidadId ?? "");
  const [fecha, setFecha] = useState(prefill?.fecha ?? fechaActual);
  const [horaInicio, setHoraInicio] = useState(prefill?.horaInicio ?? "");
  const [horaFin, setHoraFin] = useState(prefill?.horaFin ?? "");
  const [actividad, setActividad] = useState(prefill?.actividad ?? "");
  const [conflicto, setConflicto] = useState<ConflictoDetalle | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const { state, pending, submit } = useFormAction(
    editando ? actualizarAsignacion : crearAsignacion,
    initialState,
    onDone
  );

  const camposHorarioCompletos = Boolean(espacioId && fecha && horaInicio && horaFin && horaInicio < horaFin);
  const esFeriado = Boolean(fecha) && esFeriadoIrrenunciable(fecha);

  useEffect(() => {
    if (!camposHorarioCompletos) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setVerificando(true);
      fetch("/api/conflictos/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          espacioId,
          fecha,
          horaInicio,
          horaFin,
          excluirAsignacionId: prefill?.asignacionId,
        }),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => setConflicto(data.conflicto ?? null))
        .catch(() => {})
        .finally(() => setVerificando(false));
    }, 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [camposHorarioCompletos, espacioId, fecha, horaInicio, horaFin, prefill?.asignacionId]);

  function eliminar() {
    if (!prefill?.asignacionId) return;
    if (!window.confirm("¿Eliminar esta asignación? Esta acción no se puede deshacer.")) return;
    setEliminando(true);
    cancelarAsignacion(prefill.asignacionId).then(onDone);
  }

  const conflictoVisible = camposHorarioCompletos ? conflicto : null;
  const espacioSeleccionado = espacios.find((e) => e.id === espacioId);
  const avisoActividadFija =
    espacioSeleccionado?.actividad_fija &&
    actividad.trim() !== "" &&
    !actividad.toLowerCase().includes(espacioSeleccionado.actividad_fija.toLowerCase());

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="tipo" value="puntual" />
      {editando && <input type="hidden" name="asignacion_id" value={prefill!.asignacionId} />}

      <Field label="Recinto">
        <select value={recintoId} onChange={(e) => setRecintoId(e.target.value)} className="input">
          {recintos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Espacio">
        <select
          name="espacio_id"
          required
          value={espacioId}
          onChange={(e) => setEspacioId(e.target.value)}
          className="input"
        >
          {espaciosDelRecinto.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Organización">
        <select
          name="entidad_id"
          required
          value={entidadId}
          onChange={(e) => setEntidadId(e.target.value)}
          className="input"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {entidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Fecha">
        <DateField name="fecha" value={fecha} onChange={setFecha} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hora inicio">
          <TimeField name="hora_inicio" value={horaInicio} onChange={setHoraInicio} required />
        </Field>
        <Field label="Hora fin">
          <TimeField name="hora_fin" value={horaFin} onChange={setHoraFin} required />
        </Field>
      </div>

      {esFeriado && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-danger-soft)] p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <p className="text-sm text-[var(--color-danger)]">
            Este día es feriado irrenunciable, el recinto no opera. Elige otra fecha.
          </p>
        </div>
      )}

      {verificando && <p className="text-xs text-[var(--color-text-muted)]">Revisando disponibilidad…</p>}

      {conflictoVisible && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-danger-soft)] p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <p className="text-sm text-[var(--color-danger)]">
            Choca con <strong>{conflictoVisible.entidadNombre}</strong> en {conflictoVisible.espacioNombre} el{" "}
            {conflictoVisible.fecha} de {conflictoVisible.horaInicio.slice(0, 5)} a{" "}
            {conflictoVisible.horaFin.slice(0, 5)}
            {conflictoVisible.relacionado && " (espacio relacionado)"}. No podrás guardar hasta cambiar el
            horario o negociarlo con esa organización.
          </p>
        </div>
      )}

      <Field label="Actividad">
        <input name="actividad" value={actividad} onChange={(e) => setActividad(e.target.value)} className="input" />
      </Field>

      {avisoActividadFija && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-warning-soft)] p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
          <p className="text-sm text-[var(--color-warning)]">
            Este espacio está pensado preferentemente para &ldquo;{espacioSeleccionado?.actividad_fija}
            &rdquo;. Puedes continuar de todas formas.
          </p>
        </div>
      )}

      <Field label="Participantes estimados (opcional)">
        <input
          name="participantes_estimados"
          type="number"
          min={0}
          defaultValue={prefill?.participantesEstimados ?? undefined}
          className="input"
        />
      </Field>

      <Field label="Documento de respaldo (opcional)">
        <input name="documento_respaldo" defaultValue={prefill?.documentoRespaldo ?? undefined} className="input" />
      </Field>

      {state.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || eliminando || Boolean(conflictoVisible) || esFeriado} className="flex-1">
          {pending ? "Guardando…" : editando ? "Guardar cambios" : "Guardar asignación"}
        </Button>
        {editando && (
          <Button
            type="button"
            variant="danger"
            disabled={pending || eliminando}
            onClick={eliminar}
            className="flex-1"
          >
            {eliminando ? "Eliminando…" : "Eliminar asignación"}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
      {label}
      {children}
    </label>
  );
}
