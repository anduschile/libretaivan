"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { BloqueList } from "./bloque-list";
import { BloqueGrid } from "./bloque-grid";
import { SemanaGrid } from "./semana-grid";
import { AsignarSheet, type AsignarPrefill } from "./asignar-sheet";
import { sugerirHoraFin, type VentanaDisponible } from "@/lib/disponibilidad";
import type { AsignacionConDetalle } from "@/lib/data/queries";
import type { RdBloqueo, RdEntidad, RdEspacio, RdEspacioConflicto, RdRecinto } from "@/lib/db/types";

type DiaProps = {
  vista: "dia";
  espaciosDelRecinto: RdEspacio[];
  asignaciones: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
  conflictos: RdEspacioConflicto[];
  disponibilidad: Record<string, VentanaDisponible[]>;
  fechaPasada: boolean;
};

type SemanaProps = {
  vista: "semana";
  dias: string[];
  espacioSemanaId: string;
  asignaciones: AsignacionConDetalle[];
  asignacionesEspejo: AsignacionConDetalle[];
  bloqueos: RdBloqueo[];
};

export function ProgramacionInteractive({
  recintos,
  espacios,
  entidades,
  recintoId,
  fecha,
  vistaProps,
}: {
  recintos: RdRecinto[];
  espacios: RdEspacio[];
  entidades: RdEntidad[];
  recintoId: string;
  fecha: string;
  vistaProps: DiaProps | SemanaProps;
}) {
  const [sheet, setSheet] = useState<{ open: boolean; prefill?: AsignarPrefill }>({ open: false });

  function abrirVacio() {
    const espacioPorDefecto = vistaProps.vista === "semana" ? vistaProps.espacioSemanaId : undefined;
    setSheet({
      open: true,
      prefill: espacioPorDefecto ? { recintoId, espacioId: espacioPorDefecto, fecha } : undefined,
    });
  }

  function abrirConHueco(espacioId: string, fechaBloque: string, horaInicio: string, disponibleHasta: string) {
    const inicio = horaInicio.slice(0, 5);
    const hasta = disponibleHasta.slice(0, 5);
    setSheet({
      open: true,
      prefill: {
        recintoId,
        espacioId,
        fecha: fechaBloque,
        horaInicio: inicio,
        horaFin: sugerirHoraFin(inicio, hasta),
      },
    });
  }

  function abrirEdicion(asignacion: AsignacionConDetalle) {
    setSheet({
      open: true,
      prefill: {
        recintoId,
        espacioId: asignacion.espacio_id,
        fecha: asignacion.fecha,
        horaInicio: asignacion.hora_inicio.slice(0, 5),
        horaFin: asignacion.hora_fin.slice(0, 5),
        asignacionId: asignacion.id,
        entidadId: asignacion.entidad_id,
        actividad: asignacion.actividad ?? "",
        participantesEstimados: asignacion.participantes_estimados,
        documentoRespaldo: asignacion.documento_respaldo,
      },
    });
  }

  return (
    <>
      {vistaProps.vista === "dia" ? (
        <>
          <BloqueList
            espacios={vistaProps.espaciosDelRecinto}
            asignaciones={vistaProps.asignaciones}
            bloqueos={vistaProps.bloqueos}
            conflictos={vistaProps.conflictos}
            disponibilidad={vistaProps.disponibilidad}
            fechaPasada={vistaProps.fechaPasada}
            recintoId={recintoId}
            onSlotClick={(espacioId, horaInicio, hasta) => abrirConHueco(espacioId, fecha, horaInicio, hasta)}
            onAsignacionClick={abrirEdicion}
          />
          <BloqueGrid
            espacios={vistaProps.espaciosDelRecinto}
            asignaciones={vistaProps.asignaciones}
            bloqueos={vistaProps.bloqueos}
            conflictos={vistaProps.conflictos}
            recintoId={recintoId}
            onSlotClick={(espacioId, horaInicio, hasta) => abrirConHueco(espacioId, fecha, horaInicio, hasta)}
            onAsignacionClick={abrirEdicion}
          />
        </>
      ) : (
        <SemanaGrid
          dias={vistaProps.dias}
          espacioId={vistaProps.espacioSemanaId}
          asignaciones={vistaProps.asignaciones}
          asignacionesEspejo={vistaProps.asignacionesEspejo}
          bloqueos={vistaProps.bloqueos}
          recintoId={recintoId}
          onSlotClick={(fechaBloque, horaInicio, hasta) =>
            abrirConHueco(vistaProps.espacioSemanaId, fechaBloque, horaInicio, hasta)
          }
          onAsignacionClick={abrirEdicion}
        />
      )}

      <button
        type="button"
        onClick={abrirVacio}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-sm font-medium text-white shadow-lg desktop:bottom-8 desktop:right-8"
      >
        <CalendarPlus size={18} />
        Asignar horario
      </button>

      <AsignarSheet
        open={sheet.open}
        onClose={() => setSheet({ open: false })}
        recintos={recintos}
        espacios={espacios}
        entidades={entidades}
        recintoActual={recintoId}
        fechaActual={fecha}
        prefill={sheet.prefill}
      />
    </>
  );
}
