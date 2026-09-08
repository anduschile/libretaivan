"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      className="m-0 h-full max-h-full w-full max-w-full border-0 bg-transparent p-0 backdrop:bg-black/40 desktop:m-auto desktop:h-fit desktop:max-w-lg"
    >
      <div className="fixed inset-x-0 bottom-0 flex max-h-[90vh] translate-y-0 flex-col rounded-t-2xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out starting:translate-y-full desktop:static desktop:max-h-[85vh] desktop:rounded-2xl desktop:pb-0">
        <div className="flex justify-center pt-2 desktop:hidden">
          <span className="h-1.5 w-10 rounded-full bg-[var(--color-border)]" />
        </div>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
