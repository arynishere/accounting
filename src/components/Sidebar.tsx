"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Settings2,
  Layers3,
  ShoppingBag,
  Landmark,
} from "lucide-react";
import { HelpTip } from "./HelpTip";

const links = [
  {
    href: "/",
    label: "داشبورد",
    icon: BarChart3,
    help: "خلاصه فروش، خرید، سود و موجودی یکپارچه.",
    match: (path: string) => path === "/" || path.startsWith("/details"),
  },
  {
    href: "/sales",
    label: "گزارش‌های فروش",
    icon: ShoppingBag,
    help: "۱۱ گزارش اولویت‌دار مدیر فروش (قیف، تحقق هدف، کارشناسان، مطالبات و ...).",
    match: (path: string) => path.startsWith("/sales"),
  },
  {
    href: "/finance",
    label: "مالی مدیریتی",
    icon: Landmark,
    help: "۱۴ بخش داشبورد مدیریتی مالی (نقد، بودجه، مطالبات، نسبت‌ها و ...).",
    match: (path: string) => path.startsWith("/finance"),
  },
  {
    href: "/inventory",
    label: "موجودی کالا",
    icon: Layers3,
    help: "لیست کالاها با تعداد و ارزش ریالی.",
    match: (path: string) => path === "/inventory",
  },
  {
    href: "/settings",
    label: "اتصال سیستم‌ها",
    icon: Settings2,
    help: "تنظیم CRM، هلو، سپیدار و هدف فروش.",
    match: (path: string) => path === "/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-shell flex w-full flex-col gap-7 border-b-2 border-[var(--border)] px-5 py-7 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-l-2">
      <div>
        <p className="text-base font-bold text-[var(--accent-hot)]">سامانه مالی</p>
        <h1 className="mt-2 text-[1.7rem] font-extrabold text-[var(--ink)]">
          مالی‌نمای یکپارچه
        </h1>
        <p className="mt-3 text-base leading-8 text-[var(--muted)]">
          داشبورد عملیاتی + گزارش‌های فروش و مالی مدیریتی
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map(({ href, label, icon: Icon, help, match }) => {
          const active = match(pathname);
          return (
            <div key={href} className="flex items-center gap-1">
              <Link
                href={href}
                className={`nav-link flex-1 ${
                  active ? "nav-link-active" : "nav-link-idle"
                }`}
              >
                <Icon size={22} />
                {label}
              </Link>
              <HelpTip text={help} label={`راهنمای ${label}`} />
            </div>
          );
        })}
      </nav>

      <p className="mt-auto rounded-xl bg-[var(--help-bg)] p-3 text-base leading-7 text-[#7c2d12]">
        روی علامت <strong>؟</strong> بمانید تا توضیح هر بخش را ببینید.
      </p>
    </aside>
  );
}
