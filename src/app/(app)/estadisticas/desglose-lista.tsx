"use client";

import { useState } from "react";
import type { FilaEstadistica } from "@/lib/estadisticas";

function formatHoras(horas: number): string {
  return `${horas} ${horas === 1 ? "hora" : "horas"}`;
}

// Por defecto el gráfico de barras muestra como máximo esta cantidad de filas —
// con listas largas (10+ entidades/recintos) en una pantalla angosta obligaría a
// un scroll interminable solo para ver el gráfico. La tabla de más abajo siempre
// muestra la lista completa, sin este límite.
const LIMITE_BARRAS_POR_DEFECTO = 12;

export function DesgloseLista({ filas, etiquetaVacio }: { filas: FilaEstadistica[]; etiquetaVacio: string }) {
  const [mostrarTodas, setMostrarTodas] = useState(false);

  if (filas.length === 0) {
    return <p className="px-4 py-6 text-sm text-[var(--color-text-muted)] desktop:px-8">{etiquetaVacio}</p>;
  }

  const maxHoras = Math.max(...filas.map((f) => f.horas));
  const hayMas = filas.length > LIMITE_BARRAS_POR_DEFECTO;
  const filasGrafico = mostrarTodas || !hayMas ? filas : filas.slice(0, LIMITE_BARRAS_POR_DEFECTO);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 desktop:px-8">
      {/* Gráfico de barras horizontal — el largo de la barra es relativo al mayor
          valor de la lista (para que se note la diferencia entre filas), el
          porcentaje mostrado es siempre sobre el total de horas del rango. El
          nombre va en su propia fila (con salto de línea si es largo) arriba de
          la barra, en vez de compartir fila con ella, para que no se corte ni
          fuerce scroll horizontal en pantallas angostas. */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {filasGrafico.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5">
            <span className="break-words text-sm font-medium text-[var(--color-text)]">{f.nombre}</span>
            <div className="flex items-center gap-2">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${maxHoras > 0 ? (f.horas / maxHoras) * 100 : 0}%` }}
                />
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-text-muted)]">
                {formatHoras(f.horas)} · {f.porcentaje.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}

        {hayMas && (
          <button
            type="button"
            onClick={() => setMostrarTodas((m) => !m)}
            className="self-start text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            {mostrarTodas ? "Ver menos" : `Ver todas (${filas.length})`}
          </button>
        )}
      </div>

      {/* Misma información en tabla — más cómoda de leer en el celular que un
          gráfico de barras muy largo. */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5 text-right">Horas</th>
              <th className="px-4 py-2.5 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-2.5 text-[var(--color-text)]">{f.nombre}</td>
                <td className="px-4 py-2.5 text-right text-[var(--color-text)]">{f.horas}</td>
                <td className="px-4 py-2.5 text-right text-[var(--color-text-muted)]">{f.porcentaje.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
