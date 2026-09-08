import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-4 backdrop-blur desktop:px-8">
      <div className="flex items-center gap-1">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Volver"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
