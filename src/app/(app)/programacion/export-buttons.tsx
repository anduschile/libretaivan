import { FileDown, FileSpreadsheet } from "lucide-react";

export function ExportButtons({ recintoId, fecha }: { recintoId: string; fecha: string }) {
  const query = `recinto=${recintoId}&fecha=${fecha}`;

  return (
    <div className="flex gap-2 px-4 pb-4 desktop:px-8">
      <a
        href={`/api/export/pdf?${query}`}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] desktop:flex-none"
      >
        <FileDown size={16} />
        Exportar PDF
      </a>
      <a
        href={`/api/export/excel?${query}`}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] desktop:flex-none"
      >
        <FileSpreadsheet size={16} />
        Exportar Excel
      </a>
    </div>
  );
}
