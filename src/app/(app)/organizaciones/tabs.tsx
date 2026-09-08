"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/organizaciones", label: "Organizaciones" },
  { href: "/organizaciones/convenios", label: "Convenios" },
];

export function OrganizacionesTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] px-4 desktop:px-8">
      {TABS.map((tab) => {
        const active =
          tab.href === "/organizaciones" ? pathname === tab.href : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium ${
              active
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
