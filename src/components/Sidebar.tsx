"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings2, Layers3 } from "lucide-react";
import { HelpTip } from "./HelpTip";

const links = [
  {
    href: "/",
    label: "داشبورد",
    icon: BarChart3,
    help: "صفحه اصلی؛ خلاصه فروش، خرید، سود و موجودی را با نمودار نشان می‌دهد.",
  },
  {
    href: "/inventory",
    label: "موجودی کالا",
    icon: Layers3,
    help: "لیست کالاها با تعداد و ارزش ریالی؛ می‌توانید بر اساس منبع فیلتر کنید.",
  },
  {
    href: "/settings",
    label: "اتصال سیستم‌ها",
    icon: Settings2,
    help: "اینجا آدرس و رمز CRM پیام‌گستر، هلو و سپیدار را وارد می‌کنید.",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col gap-7 border-b-2 border-[var(--border)] bg-white px-5 py-7 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-l-2">
      <div>
        <p className="text-base font-bold text-[var(--accent)]">سامانه مالی</p>
        <h1 className="mt-2 text-[1.7rem] font-extrabold text-[var(--ink)]">
          مالی‌نمای یکپارچه
        </h1>
        <p className="mt-3 text-base leading-8 text-[var(--muted)]">
          مشاهده فروش، خرید و موجودی از CRM، هلو و سپیدار در یک صفحه
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map(({ href, label, icon: Icon, help }) => {
          const active = pathname === href;
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
