"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, LogOut, MapPinned, Users } from "lucide-react";
import { logout } from "@/app/(app)/actions";

const NAV_ITEMS = [
  { href: "/hoy", label: "Hoy", icon: Home },
  { href: "/programacion", label: "Programación", icon: CalendarDays },
  { href: "/recintos", label: "Recintos", icon: MapPinned },
  { href: "/organizaciones", label: "Organizaciones", icon: Users },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col desktop:flex-row">
      {/* Sidebar de escritorio */}
      <aside className="hidden desktop:flex desktop:w-64 desktop:flex-col desktop:border-r desktop:border-[var(--color-border)] desktop:bg-[var(--color-surface)] desktop:px-4 desktop:py-6">
        <div className="mb-8 px-2">
          <p className="text-lg font-semibold text-[var(--color-text)]">Recintos Deportivos</p>
          <p className="text-xs text-[var(--color-text-muted)]">Corporación de Deportes</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border)] pt-4">
          {userEmail && (
            <p className="mb-2 truncate px-2 text-xs text-[var(--color-text-muted)]">{userEmail}</p>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 pb-tabbar desktop:pb-0">{children}</div>

      {/* Barra inferior de móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] desktop:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs"
              style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
            >
              <Icon
                size={22}
                color={active ? "var(--color-accent)" : "var(--color-text-muted)"}
              />
              <span
                className={active ? "font-medium text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
