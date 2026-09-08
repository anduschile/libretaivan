"use client";

import { useTransition } from "react";
import { cambiarEstadoConvenio } from "./actions";
import type { ConvenioEstado } from "@/lib/db/types";

export function EstadoConvenioSelect({ convenioId, estado }: { convenioId: string; estado: ConvenioEstado }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={estado}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          cambiarEstadoConvenio(convenioId, e.target.value as ConvenioEstado);
        })
      }
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs"
    >
      <option value="activo">Activo</option>
      <option value="suspendido">Suspendido</option>
      <option value="terminado">Terminado</option>
    </select>
  );
}
