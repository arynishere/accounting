"use client";

import { formatMoney, formatNumber } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";

const sourceLabel = {
  crm: "CRM",
  helo: "هلو",
  sepidar: "سپیدار",
} as const;

export function InventoryTable({
  items,
  limit,
}: {
  items: InventoryItem[];
  limit?: number;
}) {
  const rows = limit ? items.slice(0, limit) : items;

  return (
    <section className="panel animate-rise overflow-hidden">
      <header className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          موجودی کالا به تفکیک
        </h2>
        <p className="text-sm text-[var(--muted)]">
          کد کالا، گروه، انبار و منبع داده
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              <th className="px-3 py-2 text-right font-medium">کد</th>
              <th className="px-3 py-2 text-right font-medium">نام کالا</th>
              <th className="px-3 py-2 text-right font-medium">گروه</th>
              <th className="px-3 py-2 text-right font-medium">انبار</th>
              <th className="px-3 py-2 text-right font-medium">تعداد</th>
              <th className="px-3 py-2 text-right font-medium">ارزش</th>
              <th className="px-3 py-2 text-right font-medium">منبع</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={`${item.source}-${item.sku}-${item.warehouse}`}
                className="border-b border-[var(--border)]/70 hover:bg-[var(--accent-soft)]/50"
              >
                <td className="px-3 py-2.5 font-mono text-xs">{item.sku}</td>
                <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                  {item.name}
                </td>
                <td className="px-3 py-2.5">{item.category}</td>
                <td className="px-3 py-2.5">{item.warehouse}</td>
                <td className="px-3 py-2.5">{formatNumber(item.quantity)}</td>
                <td className="px-3 py-2.5">{formatMoney(item.value)}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent)]">
                    {sourceLabel[item.source]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
