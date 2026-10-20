"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { toFaDigits } from "@/lib/format";
import { KpiCards } from "./KpiCards";
import {
  CategoryBars,
  InventoryPie,
  SalesPurchaseTrend,
} from "./Charts";
import { SourceStatus } from "./SourceStatus";
import { InventoryTable } from "./InventoryTable";

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("دریافت داده‌ها ناموفق بود");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--muted)]">
        در حال بارگذاری داشبورد...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="panel text-center">
        <p className="text-red-700">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void load()}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
            داشبورد یکپارچه
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            به‌روزرسانی:{" "}
            {toFaDigits(new Date(data.generatedAt).toLocaleString("fa-IR"))}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          همگام‌سازی
        </button>
      </div>

      <KpiCards data={data} />
      <SourceStatus sources={data.sources} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SalesPurchaseTrend data={data.monthly} />
        <InventoryPie data={data.inventoryByCategory} />
        <CategoryBars
          title="فروش به تفکیک گروه کالا"
          subtitle="تجمیع فروش از CRM، هلو و سپیدار"
          data={data.salesByCategory}
          color="#0f766e"
        />
        <CategoryBars
          title="خرید به تفکیک گروه کالا"
          subtitle="تجمیع خرید از منابع متصل"
          data={data.purchasesByCategory}
          color="#c2410c"
        />
      </div>

      <InventoryTable items={data.inventory} limit={8} />
    </div>
  );
}
