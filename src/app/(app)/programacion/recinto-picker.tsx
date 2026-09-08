"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { RecintoTipoIcon } from "@/components/ui/tipo-icon";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { RECINTO_GRUPO, ORDEN_GRUPOS_RECINTO } from "@/lib/db/domain";
import type { RdRecinto } from "@/lib/db/types";

function agrupar(recintos: RdRecinto[]): { grupo: string; recintos: RdRecinto[] }[] {
  const porGrupo = new Map<string, RdRecinto[]>();
  for (const r of recintos) {
    const grupo = RECINTO_GRUPO[r.tipo] ?? "Otros";
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), r]);
  }
  const ordenados = [...ORDEN_GRUPOS_RECINTO, "Otros"]
    .filter((g) => porGrupo.has(g))
    .map((grupo) => ({ grupo, recintos: porGrupo.get(grupo)! }));
  return ordenados;
}

export function RecintoPicker({ recintos, recintoId }: { recintos: RdRecinto[]; recintoId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 900px = mismo punto de quiebre "desktop" que el resto de la app (ver
  // --breakpoint-desktop en globals.css).
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, () => setOpen(false), open && isDesktop);

  const seleccionado = recintos.find((r) => r.id === recintoId);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recintos;
    return recintos.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [recintos, query]);
  const grupos = useMemo(() => agrupar(filtrados), [filtrados]);

  function elegir(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("recinto", id);
    params.delete("espacio");
    router.push(`/programacion?${params.toString()}`);
    setOpen(false);
    setQuery("");
  }

  function cerrarYLimpiar() {
    setOpen(false);
    setQuery("");
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-[var(--color-text)]"
    >
      {seleccionado && <RecintoTipoIcon tipo={seleccionado.tipo} size={15} />}
      <span className="max-w-[55vw] truncate desktop:max-w-xs">
        {seleccionado?.nombre ?? "Selecciona un recinto"}
      </span>
      <ChevronDown size={15} className="shrink-0 text-[var(--color-text-muted)]" />
    </button>
  );

  const buscador = (
    <div className="relative mb-2 px-1">
      <Search
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar recinto…"
        autoFocus
        className="input w-full pl-9"
      />
    </div>
  );

  const lista = (
    <div className="flex flex-col gap-4">
      {grupos.map(({ grupo, recintos: recintosGrupo }) => (
        <div key={grupo}>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {grupo}
          </p>
          <div className="flex flex-col gap-1">
            {recintosGrupo.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => elegir(r.id)}
                className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm ${
                  r.id === recintoId
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                }`}
              >
                <RecintoTipoIcon tipo={r.tipo} size={15} />
                {r.nombre}
              </button>
            ))}
          </div>
        </div>
      ))}
      {grupos.length === 0 && (
        <p className="px-1 text-sm text-[var(--color-text-muted)]">Sin resultados para &ldquo;{query}&rdquo;.</p>
      )}
    </div>
  );

  // Importante: se monta SOLO una de las dos variantes (hoja móvil o popover de
  // escritorio), nunca ambas a la vez. Antes ambas vivían en el árbol todo el tiempo
  // y solo se ocultaban con clases `desktop:hidden` / `hidden desktop:block`; pero un
  // <dialog> abierto con showModal() se promueve a la "top layer" del navegador y
  // sigue siendo un diálogo modal activo aunque su contenedor tenga display:none, lo
  // que dejaba el resto de la página (incluido el popover "visible") inerte —ni el
  // scroll con la rueda ni las flechas de teclado le llegaban a la lista— y por eso
  // al intentar bajar en la lista la pantalla parecía "cerrarse" y volver a
  // Programación. Al renderizar una sola variante según el ancho real de pantalla,
  // ese <dialog> fantasma nunca llega a existir en escritorio.
  if (isDesktop) {
    return (
      <div ref={popoverRef} className="relative">
        {trigger}
        {open && (
          <div className="absolute z-50 mt-1.5 w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg">
            {buscador}
            <div className="max-h-96 overscroll-contain overflow-y-auto">{lista}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {trigger}
      <Sheet open={open} onClose={cerrarYLimpiar} title="Elegir recinto">
        {open && (
          <>
            {buscador}
            {lista}
          </>
        )}
      </Sheet>
    </div>
  );
}
