"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, DataSource } from "@/lib/types";
import { InventoryTable } from "./InventoryTable";
import { InventoryPie } from "./Charts";

export function InventoryView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [source, setSource] = useState<"all" | DataSource>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    })();
  }, []);

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
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        در حال بارگذاری موجودی...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          موجودی کالا
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
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
          <option value="crm">CRM</option>
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
