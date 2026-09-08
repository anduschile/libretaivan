"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function VistaToggle({ vista }: { vista: "dia" | "semana" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function irA(nuevaVista: "dia" | "semana") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("vista", nuevaVista);
    router.push(`/programacion?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      {(["dia", "semana"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => irA(v)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            vista === v
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {v === "dia" ? "Día" : "Semana"}
        </button>
      ))}
    </div>
  );
}
