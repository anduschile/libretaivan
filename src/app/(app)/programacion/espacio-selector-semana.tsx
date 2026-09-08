"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { RdEspacio } from "@/lib/db/types";

export function EspacioSelectorSemana({ espacios, espacioId }: { espacios: RdEspacio[]; espacioId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (espacios.length <= 1) return null;

  function irA(nuevoEspacioId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("espacio", nuevoEspacioId);
    router.push(`/programacion?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 desktop:px-8">
      {espacios.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => irA(e.id)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
            e.id === espacioId
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
          }`}
        >
          {e.nombre}
        </button>
      ))}
    </div>
  );
}
