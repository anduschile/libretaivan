"use client";

import { useTransition } from "react";
import { Check, X, Ban } from "lucide-react";
import { cancelarAsignacion, marcarUsoEfectivo } from "./actions";

export function BloqueActions({
  asignacionId,
  usoEfectivo,
  mostrarUso,
}: {
  asignacionId: string;
  usoEfectivo: boolean | null;
  mostrarUso: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      {mostrarUso && (
        <>
          <button
            type="button"
            title="Marcar como usada"
            disabled={pending}
            onClick={() => startTransition(() => marcarUsoEfectivo(asignacionId, true))}
            className={`rounded-full p-1.5 ${
              usoEfectivo === true
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            }`}
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            title="Marcar como no usada"
            disabled={pending}
            onClick={() => startTransition(() => marcarUsoEfectivo(asignacionId, false))}
            className={`rounded-full p-1.5 ${
              usoEfectivo === false
                ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            }`}
          >
            <X size={15} />
          </button>
        </>
      )}
      <button
        type="button"
        title="Cancelar asignación"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Cancelar esta asignación?")) {
            startTransition(() => cancelarAsignacion(asignacionId));
          }
        }}
        className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
      >
        <Ban size={15} />
      </button>
    </div>
  );
}
