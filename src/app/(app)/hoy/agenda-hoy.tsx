"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { colorBordeEntidad } from "@/lib/db/domain";
import type { AgendaItemHoy } from "@/lib/data/hoy";

// Primeras filas visibles antes de tener que pedir la lista completa — evitar un
// scroll interminable en el celular cuando un día tiene muchas asignaciones (ver
// el mismo patrón "Ver todas" en el panel de Estadísticas).
const LIMITE_POR_DEFECTO = 15;

export function AgendaHoy({ items, fecha }: { items: AgendaItemHoy[]; fecha: string }) {
  const [mostrarTodas, setMostrarTodas] = useState(false);

  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-[var(--color-text-muted)] desktop:px-8">
        No hay asignaciones confirmadas para hoy en ningún recinto.
      </p>
    );
  }

  const hayMas = items.length > LIMITE_POR_DEFECTO;
  const visibles = mostrarTodas || !hayMas ? items : items.slice(0, LIMITE_POR_DEFECTO);

  return (
    <div className="flex flex-col gap-2 px-4 pb-4 desktop:px-8">
      {visibles.map((item) => (
        <Link key={item.id} href={`/programacion?recinto=${item.recintoId}&vista=dia&fecha=${fecha}`}>
          <Card
            borderColorClass={item.entidadTipo ? colorBordeEntidad(item.entidadTipo) : "border-l-gray-400"}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                <Clock size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                {item.horaInicio}–{item.horaFin}
              </p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {item.entidadNombre}
                {item.actividad && ` · ${item.actividad}`}
              </p>
            </div>
            <p className="shrink-0 text-right text-xs text-[var(--color-text-muted)]">
              {item.recintoNombre}
              <br />
              {item.espacioNombre}
            </p>
          </Card>
        </Link>
      ))}

      {hayMas && (
        <button
          type="button"
          onClick={() => setMostrarTodas((m) => !m)}
          className="self-start text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          {mostrarTodas ? "Ver menos" : `Ver todas (${items.length})`}
        </button>
      )}
    </div>
  );
}
