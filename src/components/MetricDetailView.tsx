"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { formatCompact, formatMoney, toFaDigits } from "@/lib/format";
import {
  isValidRange,
  type DateRange,
} from "@/lib/date-range";
import {
  METRIC_META,
  metricBySource,
  metricCategories,
  metricMonthly,
  metricTotal,
  type MetricKey,
} from "@/lib/metric-detail";
import { ExportButtons } from "./ExportButtons";
import { HelpTip, LabelWithHelp } from "./HelpTip";

const MetricOverviewChart = dynamic(
  () => import("./MetricDetailCharts").then((m) => m.MetricOverviewChart),
  { ssr: false, loading: () => <Skeleton /> },
);
const MetricCategoryBars = dynamic(
  () => import("./MetricDetailCharts").then((m) => m.MetricCategoryBars),
  { ssr: false, loading: () => <Skeleton /> },
);
const MetricSourcePie = dynamic(
  () => import("./MetricDetailCharts").then((m) => m.MetricSourcePie),
  { ssr: false, loading: () => <Skeleton /> },
);

function Skeleton() {
  return (
    <section className="panel">
      <div className="flex h-72 items-center justify-center text-[var(--muted)]">
        در حال آماده‌سازی نمودار...
      </div>
    </section>
  );
}

type Props = {
  metric: MetricKey;
  initialData?: DashboardData | null;
  initialFrom?: string;
  initialTo?: string;
};

export function MetricDetailView({
  metric,
  initialData = null,
  initialFrom = "",
  initialTo = "",
}: Props) {
  const meta = METRIC_META[metric];
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | null>(() => {
    if (initialFrom && initialTo && isValidRange({ from: initialFrom, to: initialTo })) {
      return { from: initialFrom, to: initialTo };
    }
    return null;
  });

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ refresh: "1" });
      let active = range;
      if (!active) {
        try {
          const from = window.localStorage.getItem("mali-date-from") || "";
          const to = window.localStorage.getItem("mali-date-to") || "";
          if (isValidRange({ from, to })) active = { from, to };
        } catch {
          /* ignore */
        }
      }
      if (active && isValidRange(active)) {
        qs.set("from", active.from);
        qs.set("to", active.to);
        setRange(active);
      }
      const res = await fetch(`/api/dashboard?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
      setData((await res.json()) as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    if (!data) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthly = useMemo(
    () => (data ? metricMonthly(data, metric) : []),
    [data, metric],
  );
  const categories = useMemo(
    () => (data ? metricCategories(data, metric) : []),
    [data, metric],
  );
  const bySource = useMemo(
    () => (data ? metricBySource(data, metric) : []),
    [data, metric],
  );

  if (!data) {
    return (
      <div className="panel mx-auto max-w-lg text-center">
        <p className="text-lg text-red-700">{error || "در حال بارگذاری..."}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void load()}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  const total = metricTotal(data, metric);
  const backQs =
    range && isValidRange(range)
      ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
      : "";

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/${backQs}`}
            className="inline-flex items-center gap-1 text-base font-bold text-[var(--accent-hot)] hover:underline"
          >
            <ArrowRight size={18} />
            بازگشت به داشبورد
          </Link>
          <h2 className="mt-3 text-[var(--text-2xl)] font-extrabold text-[var(--ink)]">
            <LabelWithHelp help={meta.help}>{meta.title}</LabelWithHelp>
          </h2>
          <p className="mt-2 text-base text-[var(--muted)]">
            {meta.subtitle}
            {range && (
              <span>
                {" "}
                · بازه: {toFaDigits(range.from)} تا {toFaDigits(range.to)}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons data={data} />
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => void load()}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            به‌روزرسانی
          </button>
          <HelpTip text="خروجی Excel/XML همین صفحه جزئیات را با بازه فعلی می‌دهد." />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      <article className={`kpi-card kpi-${metric === "purchases" ? "buy" : metric === "stock" ? "stock" : metric === "profit" ? "profit" : "sales"}`}>
        <p className="text-base font-semibold text-[var(--muted)]">جمع کل این شاخص</p>
        <p className="mt-2 text-[var(--text-2xl)] font-extrabold">{formatCompact(total)}</p>
        <p className="mt-1 text-base text-[var(--muted)]">{formatMoney(total)}</p>
      </article>

      <MetricOverviewChart
        title={`نمودار کلی — ${meta.title.replace("جزئیات ", "")}`}
        data={monthly}
        color={meta.color}
        dual={metric === "profit"}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <MetricCategoryBars
          title="ریز به تفکیک گروه کالا"
          data={categories}
          color={meta.color}
        />
        <MetricSourcePie title="ریز به تفکیک منبع" data={bySource} />
      </div>

      <section className="panel overflow-x-auto">
        <h3 className="mb-3 text-lg font-extrabold">جدول ریز ماهانه</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ماه</th>
              <th>مبلغ</th>
              {metric === "profit" && (
                <>
                  <th>فروش</th>
                  <th>خرید</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {monthly.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{formatMoney(row.value)}</td>
                {metric === "profit" && (
                  <>
                    <td>{formatMoney(row.sales ?? 0)}</td>
                    <td>{formatMoney(row.purchases ?? 0)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {metric === "stock" && (
        <section className="panel overflow-x-auto">
          <h3 className="mb-3 text-lg font-extrabold">ریز اقلام موجودی</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>کد</th>
                <th>نام</th>
                <th>گروه</th>
                <th>تعداد</th>
                <th>ارزش</th>
                <th>منبع</th>
              </tr>
            </thead>
            <tbody>
              {data.inventory.slice(0, 40).map((item) => (
                <tr key={`${item.source}-${item.sku}-${item.name}`}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{toFaDigits(item.quantity)}</td>
                  <td>{formatMoney(item.value)}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {categories.length > 0 && (
        <section className="panel overflow-x-auto">
          <h3 className="mb-3 text-lg font-extrabold">جدول ریز گروهی</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>گروه</th>
                <th>مبلغ</th>
                <th>تعداد</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((row) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{toFaDigits(row.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
