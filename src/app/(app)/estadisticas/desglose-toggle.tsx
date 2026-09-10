"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DesgloseToggle({ desglose }: { desglose: "entidad" | "recinto" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function irA(nuevo: "entidad" | "recinto") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("desglose", nuevo);
    router.push(`/estadisticas?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      {(["entidad", "recinto"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => irA(d)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            desglose === d
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {d === "entidad" ? "Por entidad" : "Por recinto"}
        </button>
      ))}
    </div>
  );
}
