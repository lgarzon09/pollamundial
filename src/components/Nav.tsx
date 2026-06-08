"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";

type Props = {
  displayName: string;
  isAdmin: boolean;
};

const ITEMS = [
  { href: "/mi-resumen", label: "Inicio", star: true },
  { href: "/predicciones", label: "Predicciones" },
  { href: "/participantes", label: "Participantes" },
];

export function Nav({ displayName, isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [...ITEMS, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];

  const isActive = (href: string) => {
    if (href === "/mi-resumen") return pathname === "/mi-resumen";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link
          href="/mi-resumen"
          className="font-bold tracking-tight text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
          onClick={() => setOpen(false)}
        >
          Polla <span className="text-zinc-900 dark:text-zinc-100">M26</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {items.map((it) => (
            <NavLink
              key={it.href}
              href={it.href}
              active={isActive(it.href)}
              star={"star" in it ? it.star : false}
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop user + logout */}
        <form action={logout} className="hidden sm:flex items-center gap-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 max-w-[140px] truncate">
            {displayName}
          </span>
          <button
            type="submit"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Salir
          </button>
        </form>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 -mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <span aria-hidden className="block w-6 h-6 relative">
            <span
              className={`absolute left-0 right-0 h-0.5 bg-current transition-all ${
                open ? "top-1/2 rotate-45" : "top-1.5"
              }`}
            />
            <span
              className={`absolute left-0 right-0 top-1/2 h-0.5 bg-current transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 right-0 h-0.5 bg-current transition-all ${
                open ? "top-1/2 -rotate-45" : "top-4"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <nav className="px-3 py-2 flex flex-col">
            {items.map((it) => {
              const active = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-3 rounded-md text-base font-medium flex items-center justify-between ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  <span>
                    {"star" in it && it.star ? "★ " : ""}
                    {it.label}
                  </span>
                  {active && (
                    <span aria-hidden className="text-emerald-600">
                      ●
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2 flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">
                {displayName}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-zinc-700 dark:text-zinc-300 font-medium hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Salir
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  star,
  children,
}: {
  href: string;
  active: boolean;
  star?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {star ? "★ " : ""}
      {children}
    </Link>
  );
}
