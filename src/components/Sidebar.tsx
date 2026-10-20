"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings2, Layers3 } from "lucide-react";

const links = [
  { href: "/", label: "داشبورد", icon: BarChart3 },
  { href: "/inventory", label: "موجودی کالا", icon: Layers3 },
  { href: "/settings", label: "اتصال API", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col gap-8 border-b border-[var(--border)] bg-[var(--panel)] px-5 py-6 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-l">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-[var(--accent)]">
          MALI SYNC
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
          مالی‌نمای یکپارچه
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          اتصال CRM، هلو و سپیدار در یک نگاه
        </p>
      </div>

      <nav className="flex gap-2 lg:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--ink)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
