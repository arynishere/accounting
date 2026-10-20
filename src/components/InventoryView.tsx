"use client";

import { useMemo, useState } from "react";
import type { DashboardData, DataSource } from "@/lib/types";
import { InventoryTable } from "./InventoryTable";
import { InventoryPie } from "./Charts";
import { LabelWithHelp } from "./HelpTip";

export function InventoryView({
  initialData = null,
}: {
  initialData?: DashboardData | null;
}) {
  const [data] = useState<DashboardData | null>(initialData);
  const [source, setSource] = useState<"all" | DataSource>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.inventory.filter((item) => {
      const bySource = source === "all" || item.source === source;
      const q = query.trim();
      const byQuery =
        !q ||
        item.name.includes(q) ||
        item.sku.includes(q) ||
        item.category.includes(q);
      return bySource && byQuery;
    });
  }, [data, source, query]);

  if (!data) {
    return (
      <div className="panel text-center text-lg text-[var(--muted)]">
        داده‌ای برای نمایش موجودی نیست. داشبورد را یک‌بار باز کنید یا سرور را
        بررسی کنید.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[var(--text-2xl)] font-extrabold">
          <LabelWithHelp help="این صفحه فقط موجودی انبار را نشان می‌دهد. می‌توانید منبع یا نام کالا را فیلتر کنید.">
            موجودی کالا
          </LabelWithHelp>
        </h2>
        <p className="mt-2 text-base text-[var(--muted)]">
          فیلتر بر اساس منبع داده و جستجوی کالا
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="field max-w-xs"
          value={source}
          onChange={(e) => setSource(e.target.value as "all" | DataSource)}
        >
          <option value="all">همه منابع</option>
          <option value="crm">پیام‌گستر</option>
          <option value="helo">هلو</option>
          <option value="sepidar">سپیدار</option>
        </select>
        <input
          className="field max-w-md"
          placeholder="جستجو نام، کد یا گروه..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <InventoryPie data={data.inventoryByCategory} />
      <InventoryTable items={filtered} />
    </div>
  );
}
