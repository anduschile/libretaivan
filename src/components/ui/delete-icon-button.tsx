"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

export function DeleteIconButton({
  action,
  confirmMessage,
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Eliminar"
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        startTransition(() => {
          action();
        });
      }}
      className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-50"
    >
      <Trash2 size={15} />
    </button>
  );
}
