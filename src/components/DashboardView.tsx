"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { toFaDigits } from "@/lib/format";
import { KpiCards } from "./KpiCards";
import { SourceStatus } from "./SourceStatus";
import { InventoryTable } from "./InventoryTable";
import { HelpTip, LabelWithHelp } from "./HelpTip";

const SalesPurchaseTrend = dynamic(
  () => import("./Charts").then((m) => m.SalesPurchaseTrend),
  { ssr: false, loading: () => <ChartSkeleton title="روند فروش و خرید" /> },
);
const InventoryPie = dynamic(
  () => import("./Charts").then((m) => m.InventoryPie),
  {
    ssr: false,
    loading: () => <ChartSkeleton title="موجودی به تفکیک گروه کالا" />,
  },
);
const CategoryBars = dynamic(
  () => import("./Charts").then((m) => m.CategoryBars),
  { ssr: false, loading: () => <ChartSkeleton title="تفکیک گروهی" /> },
);

function ChartSkeleton({ title }: { title: string }) {
  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 flex h-72 items-center justify-center text-base text-[var(--muted)]">
        در حال آماده‌سازی نمودار...
      </div>
    </section>
  );
}

type Props = {
  initialData?: DashboardData | null;
  initialError?: string | null;
};

export function DashboardView({
  initialData = null,
  initialError = null,
}: Props) {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("/api/dashboard?refresh=1", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
      setData((await res.json()) as DashboardData);
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "زمان به‌روزرسانی تمام شد."
          : err instanceof Error
            ? err.message
            : "خطای ناشناخته";
      setError(message);
    } finally {
      window.clearTimeout(timer);
      setRefreshing(false);
    }
  }, []);

  // اگر داده اولیه از سرور نیامد
  if (!data) {
    return (
      <div className="panel mx-auto max-w-lg text-center">
        <p className="text-lg text-red-700">
          {error || "داده‌ای برای نمایش نیست."}
        </p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => void load()}
          disabled={refreshing}
        >
          {refreshing ? "لطفاً صبر کنید..." : "تلاش مجدد"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-2xl)] font-extrabold text-[var(--ink)]">
            <LabelWithHelp help="این صفحه خلاصه وضعیت مالی کسب‌وکار را از سه سیستم CRM، هلو و سپیدار یکجا نشان می‌دهد.">
              داشبورد یکپارچه
            </LabelWithHelp>
          </h2>
          <p className="mt-2 text-base text-[var(--muted)]">
            آخرین به‌روزرسانی:{" "}
            {toFaDigits(new Date(data.generatedAt).toLocaleString("fa-IR"))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => void load()}
            disabled={refreshing}
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "در حال به‌روزرسانی..." : "به‌روزرسانی اطلاعات"}
          </button>
          <HelpTip text="با زدن این دکمه، دوباره از سیستم‌ها اطلاعات تازه خوانده می‌شود." />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-base text-red-800">
          آخرین به‌روزرسانی ناموفق بود: {error}
        </p>
      )}

      <KpiCards data={data} />
      <SourceStatus sources={data.sources} />

      <div className="grid gap-5 xl:grid-cols-2">
        <SalesPurchaseTrend data={data.monthly} />
        <InventoryPie data={data.inventoryByCategory} />
        <CategoryBars
          title="فروش به تفکیک گروه کالا"
          subtitle="کدام گروه کالا بیشتر فروخته شده"
          help="نوارها مبلغ فروش هر گروه کالا را نشان می‌دهند."
          data={data.salesByCategory}
          color="#0b5cab"
        />
        <CategoryBars
          title="خرید به تفکیک گروه کالا"
          subtitle="کدام گروه کالا بیشتر خریداری شده"
          help="نوارها مبلغ خرید هر گروه کالا را نشان می‌دهند."
          data={data.purchasesByCategory}
          color="#c2410c"
        />
      </div>

      <InventoryTable items={data.inventory} limit={8} />
    </div>
  );
}
