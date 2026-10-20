"use client";

import { formatMoney, formatNumber } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";
import { LabelWithHelp } from "./HelpTip";

const sourceLabel = {
  crm: "پیام‌گستر",
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
        <h2 className="text-[var(--text-lg)] font-extrabold">
          <LabelWithHelp help="جدول کالاهای انبار: کد، نام، گروه، تعداد، ارزش ریالی و اینکه از کدام نرم‌افزار آمده.">
            موجودی کالا به تفکیک
          </LabelWithHelp>
        </h2>
        <p className="mt-1 text-base text-[var(--muted)]">
          کد کالا، گروه، انبار و منبع داده
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <LabelWithHelp help="کد شناسایی کالا در نرم‌افزار مبدأ">
                  کد
                </LabelWithHelp>
              </th>
              <th>نام کالا</th>
              <th>
                <LabelWithHelp help="دسته‌بندی کالا مثل الکترونیکی یا غذایی">
                  گروه
                </LabelWithHelp>
              </th>
              <th>انبار</th>
              <th>
                <LabelWithHelp help="چند واحد از این کالا الان موجود است">
                  تعداد
                </LabelWithHelp>
              </th>
              <th>
                <LabelWithHelp help="ارزش ریالی تقریبی موجودی این کالا">
                  ارزش
                </LabelWithHelp>
              </th>
              <th>
                <LabelWithHelp help="این ردیف از کدام سیستم خوانده شده">
                  منبع
                </LabelWithHelp>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={`${item.source}-${item.sku}-${item.warehouse}`}>
                <td className="font-mono text-base">{item.sku}</td>
                <td className="font-bold text-[var(--ink)]">{item.name}</td>
                <td>{item.category}</td>
                <td>{item.warehouse}</td>
                <td className="font-semibold">{formatNumber(item.quantity)}</td>
                <td className="font-semibold">{formatMoney(item.value)}</td>
                <td>
                  <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-base font-bold text-[var(--accent)]">
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
