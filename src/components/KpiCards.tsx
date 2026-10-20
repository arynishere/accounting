"use client";

import { ArrowDownLeft, ArrowUpRight, Boxes, TrendingUp } from "lucide-react";
import { formatCompact, formatMoney } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { LabelWithHelp } from "./HelpTip";

export function KpiCards({ data }: { data: DashboardData }) {
  const cards = [
    {
      title: "جمع فروش",
      help: "مجموع مبلغ فروش‌ها از همه سیستم‌های متصل (پیام‌گستر، هلو و سپیدار) در دوره جاری.",
      value: formatCompact(data.totals.sales),
      hint: formatMoney(data.totals.sales),
      icon: ArrowUpRight,
      tone: "sales",
    },
    {
      title: "جمع خرید",
      help: "مجموع مبلغ خرید کالا/خدمات که از سیستم‌های متصل خوانده شده است.",
      value: formatCompact(data.totals.purchases),
      hint: formatMoney(data.totals.purchases),
      icon: ArrowDownLeft,
      tone: "buy",
    },
    {
      title: "سود ناخالص تقریبی",
      help: "تقریبی است: جمع فروش منهای جمع خرید. هزینه‌های دیگر مثل اجاره یا حقوق اینجا نیست.",
      value: formatCompact(data.totals.profit),
      hint: formatMoney(data.totals.profit),
      icon: TrendingUp,
      tone: "profit",
    },
    {
      title: "ارزش موجودی",
      help: "ارزش ریالی کالاهایی که الان در انبارها موجود است (تعداد × قیمت).",
      value: formatCompact(data.totals.inventoryValue),
      hint: `${formatCompact(data.totals.inventoryUnits)} واحد کالا`,
      icon: Boxes,
      tone: "stock",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.title}
          className={`kpi-card kpi-${card.tone} animate-rise`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-[var(--muted)]">
                <LabelWithHelp help={card.help}>{card.title}</LabelWithHelp>
              </p>
              <p className="mt-3 text-[var(--text-2xl)] font-extrabold text-[var(--ink)]">
                {card.value}
              </p>
              <p className="mt-2 text-base text-[var(--muted)]">{card.hint}</p>
            </div>
            <span className="rounded-xl bg-white p-3 text-[var(--accent)] shadow-sm">
              <card.icon size={26} />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
