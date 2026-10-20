"use client";

import { ArrowDownLeft, ArrowUpRight, Boxes, TrendingUp } from "lucide-react";
import { formatCompact, formatMoney } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

export function KpiCards({ data }: { data: DashboardData }) {
  const cards = [
    {
      title: "جمع فروش",
      value: formatCompact(data.totals.sales),
      hint: formatMoney(data.totals.sales),
      icon: ArrowUpRight,
      tone: "sales",
    },
    {
      title: "جمع خرید",
      value: formatCompact(data.totals.purchases),
      hint: formatMoney(data.totals.purchases),
      icon: ArrowDownLeft,
      tone: "buy",
    },
    {
      title: "سود ناخالص تقریبی",
      value: formatCompact(data.totals.profit),
      hint: formatMoney(data.totals.profit),
      icon: TrendingUp,
      tone: "profit",
    },
    {
      title: "ارزش موجودی",
      value: formatCompact(data.totals.inventoryValue),
      hint: `${formatCompact(data.totals.inventoryUnits)} واحد`,
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
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">{card.title}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{card.hint}</p>
            </div>
            <span className="rounded-xl bg-white/70 p-2 text-[var(--accent)]">
              <card.icon size={20} />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
