"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { toFaDigits } from "@/lib/format";
import {
  isValidRange,
  shiftDays,
  sliceDashboard,
  todayIso,
  type DateRange,
} from "@/lib/date-range";
import { KpiCards } from "./KpiCards";
import { SourceStatus } from "./SourceStatus";
import { InventoryTable } from "./InventoryTable";
import { HelpTip, LabelWithHelp } from "./HelpTip";
import { ExportButtons } from "./ExportButtons";
import { DateRangeBar } from "./DateRangeBar";

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

type SyncMode = "manual" | "hourly" | "realtime";

const SYNC_MS: Record<SyncMode, number | null> = {
  manual: null,
  hourly: 60 * 60 * 1000,
  realtime: 20 * 1000,
};

const SYNC_LABEL: Record<SyncMode, string> = {
  manual: "دستی",
  hourly: "ساعتی",
  realtime: "لحظه‌ای",
};

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
  const [syncMode, setSyncMode] = useState<SyncMode>("manual");
  const [nextTickAt, setNextTickAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [rangeDraft, setRangeDraft] = useState<DateRange>({
    from: shiftDays(-90),
    to: todayIso(),
  });
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null);
  const [brushIndices, setBrushIndices] = useState<number[] | null>(null);
  const busyRef = useRef(false);
  const rangeRef = useRef<DateRange | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean; range?: DateRange | null }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!opts?.silent) setRefreshing(true);
    setError(null);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);
    const range = opts?.range === undefined ? rangeRef.current : opts.range;

    try {
      const qs = new URLSearchParams({ refresh: "1" });
      if (range && isValidRange(range)) {
        qs.set("from", range.from);
        qs.set("to", range.to);
      }
      const res = await fetch(`/api/dashboard?${qs.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
      const json = (await res.json()) as DashboardData;
      setData(json);
      setBrushIndices(null);
      if (range && isValidRange(range)) {
        setAppliedRange(range);
        rangeRef.current = range;
      }
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
      busyRef.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const ms = SYNC_MS[syncMode];
    if (!ms) {
      setNextTickAt(null);
      return;
    }
    setNextTickAt(Date.now() + ms);
    const id = window.setInterval(() => {
      void load({ silent: syncMode === "realtime" });
      setNextTickAt(Date.now() + ms);
    }, ms);
    return () => window.clearInterval(id);
  }, [syncMode, load]);

  useEffect(() => {
    if (!nextTickAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nextTickAt]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("mali-sync-mode") as SyncMode | null;
      if (saved && saved in SYNC_MS) setSyncMode(saved);
      const from = window.localStorage.getItem("mali-date-from");
      const to = window.localStorage.getItem("mali-date-to");
      if (from && to && isValidRange({ from, to })) {
        setRangeDraft({ from, to });
        setAppliedRange({ from, to });
        rangeRef.current = { from, to };
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("mali-sync-mode", syncMode);
    } catch {
      /* ignore */
    }
  }, [syncMode]);

  useEffect(() => {
    try {
      if (appliedRange) {
        window.localStorage.setItem("mali-date-from", appliedRange.from);
        window.localStorage.setItem("mali-date-to", appliedRange.to);
      }
    } catch {
      /* ignore */
    }
  }, [appliedRange]);

  const viewData = useMemo(() => {
    if (!data) return null;
    return sliceDashboard(data, brushIndices, appliedRange);
  }, [data, brushIndices, appliedRange]);

  const countdown =
    nextTickAt != null
      ? Math.max(0, Math.ceil((nextTickAt - now) / 1000))
      : null;

  function formatCountdown(sec: number): string {
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${toFaDigits(h)}:${toFaDigits(String(m).padStart(2, "0"))}:${toFaDigits(String(sec % 60).padStart(2, "0"))}`;
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${toFaDigits(m)}:${toFaDigits(String(s).padStart(2, "0"))}`;
  }

  if (!data || !viewData) {
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
            {appliedRange && (
              <span>
                {" "}
                · بازه: {toFaDigits(appliedRange.from)} تا{" "}
                {toFaDigits(appliedRange.to)}
              </span>
            )}
            {brushIndices && (
              <span> · انتخاب روی نمودار: {toFaDigits(brushIndices.length)} ماه</span>
            )}
            {syncMode !== "manual" && (
              <span className="mr-2 inline-flex items-center gap-1.5">
                {syncMode === "realtime" && <span className="sync-live-dot" />}
                · حالت {SYNC_LABEL[syncMode]}
                {countdown != null && countdown > 0
                  ? ` · بعدی ${formatCountdown(countdown)}`
                  : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="sync-seg" role="group" aria-label="حالت همگام‌سازی">
            {(Object.keys(SYNC_MS) as SyncMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={syncMode === mode ? "active" : ""}
                onClick={() => setSyncMode(mode)}
              >
                {SYNC_LABEL[mode]}
              </button>
            ))}
          </div>
          <HelpTip text="دستی: فقط با دکمه. ساعتی: هر ۶۰ دقیقه. لحظه‌ای: حدود هر ۲۰ ثانیه از منابع خوانده می‌شود." />

          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => void load({ range: appliedRange })}
            disabled={refreshing}
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "در حال به‌روزرسانی..." : "به‌روزرسانی الان"}
          </button>
        </div>
      </div>

      <DateRangeBar
        from={rangeDraft.from}
        to={rangeDraft.to}
        onChange={setRangeDraft}
        applying={refreshing}
        onApply={() => {
          if (!isValidRange(rangeDraft)) return;
          void load({ range: rangeDraft });
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExportButtons data={viewData} />
        <p className="text-sm text-[var(--muted)]">
          خروجی Excel/XML مطابق بازه و انتخاب فعلی نمودار
        </p>
      </div>

      {error && (
        <p className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-base text-red-800">
          آخرین به‌روزرسانی ناموفق بود: {error}
        </p>
      )}

      <KpiCards
        data={viewData}
        dateFrom={appliedRange?.from}
        dateTo={appliedRange?.to}
      />
      <SourceStatus sources={data.sources} />

      <div className="grid gap-5 xl:grid-cols-2">
        <SalesPurchaseTrend
          data={data.monthly}
          onBrushRange={setBrushIndices}
        />
        <InventoryPie data={viewData.inventoryByCategory} />
        <CategoryBars
          title="فروش به تفکیک گروه کالا"
          subtitle="کدام گروه کالا بیشتر فروخته شده"
          help="نوارها مبلغ فروش هر گروه کالا را نشان می‌دهند."
          data={viewData.salesByCategory}
          color="#ea580c"
        />
        <CategoryBars
          title="خرید به تفکیک گروه کالا"
          subtitle="کدام گروه کالا بیشتر خریداری شده"
          help="نوارها مبلغ خرید هر گروه کالا را نشان می‌دهند."
          data={viewData.purchasesByCategory}
          color="#dc2626"
        />
      </div>

      <InventoryTable items={viewData.inventory} limit={8} />
    </div>
  );
}
