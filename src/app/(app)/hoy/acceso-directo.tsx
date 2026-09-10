"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { AsignarSheet } from "@/app/(app)/programacion/asignar-sheet";
import type { RdEntidad, RdEspacio, RdRecinto } from "@/lib/db/types";

// Mismo flujo de "Asignar horario" que ya existe en Programación, reutilizado acá
// para no navegar primero a un recinto — el formulario ya trae su propio selector
// de Recinto, así que sin recinto pre-seleccionado simplemente lo elige ahí.
export function AccesoDirectoAsignar({
  recintos,
  espacios,
  entidades,
  fecha,
}: {
  recintos: RdRecinto[];
  espacios: RdEspacio[];
  entidades: RdEntidad[];
  fecha: string;
}) {
  const [open, setOpen] = useState(false);

  if (recintos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-sm font-medium text-white shadow-lg desktop:bottom-8 desktop:right-8"
      >
        <CalendarPlus size={18} />
        Asignar horario
      </button>

      <AsignarSheet
        open={open}
        onClose={() => setOpen(false)}
        recintos={recintos}
        espacios={espacios}
        entidades={entidades}
        recintoActual={recintos[0].id}
        fechaActual={fecha}
        prefill={{ fecha }}
      />
    </>
  );
}
