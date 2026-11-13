"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, FileCode2, FileSpreadsheet, RefreshCw } from "lucide-react";
import type { ReportPayload } from "@/lib/report-types";
import type { DateRange } from "@/lib/date-range";
import {
  isValidRange,
  shiftDays,
  todayIso,
} from "@/lib/date-range";
import { formatCompact, formatMoney, formatNumber, toFaDigits } from "@/lib/format";
import {
  downloadReportExcel,
  downloadReportXml,
} from "@/lib/report-export";
import { DateRangeBar } from "./DateRangeBar";
import { HelpTip } from "./HelpTip";

const ReportOverviewChart = dynamic(
  () => import("./ReportCharts").then((m) => m.ReportOverviewChart),
  { ssr: false },
);
const ReportBreakdownChart = dynamic(
  () => import("./ReportCharts").then((m) => m.ReportBreakdownChart),
  { ssr: false },
);
const ReportBarsChart = dynamic(
  () => import("./ReportCharts").then((m) => m.ReportBarsChart),
  { ssr: false },
);

function formatKpi(value: number, format?: string): string {
  if (format === "money") return formatCompact(value);
  if (format === "percent") return `${toFaDigits(value)}٪`;
  if (format === "days") return `${toFaDigits(value)} روز`;
  return formatNumber(value);
}

function modeBadge(mode: string) {
  if (mode === "live") return { text: "داده واقعی", cls: "status-ok" };
  if (mode === "hybrid") return { text: "ترکیبی (واقعی+نمونه)", cls: "status-mock" };
  return { text: "داده نمونه", cls: "status-mock" };
}

type Props = {
  reportId: string;
  groupPath: "sales" | "finance";
  initialData?: ReportPayload | null;
  initialFrom?: string;
  initialTo?: string;
};

export function ReportShell({
  reportId,
  groupPath,
  initialData = null,
  initialFrom = "",
  initialTo = "",
}: Props) {
  const [data, setData] = useState<ReportPayload | null>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState<DateRange>({
    from: initialFrom || shiftDays(-90),
    to: initialTo || todayIso(),
  });
  const [applied, setApplied] = useState<DateRange | null>(
    initialFrom && initialTo && isValidRange({ from: initialFrom, to: initialTo })
      ? { from: initialFrom, to: initialTo }
      : null,
  );

  const load = useCallback(
    async (range?: DateRange | null) => {
      setRefreshing(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        const r = range && isValidRange(range) ? range : applied;
        if (r && isValidRange(r)) {
          qs.set("from", r.from);
          qs.set("to", r.to);
        }
        const res = await fetch(`/api/reports/${reportId}?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
        const json = (await res.json()) as ReportPayload;
        setData(json);
        if (r && isValidRange(r)) setApplied(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
      } finally {
        setRefreshing(false);
      }
    },
    [reportId, applied],
  );

  useEffect(() => {
    if (!data) void load(rangeDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <div className="panel mx-auto max-w-lg text-center">
        <p className="text-lg text-red-700">{error || "در حال بارگذاری گزارش..."}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void load()}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  const badge = modeBadge(data.dataMode);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/${groupPath}`}
            className="inline-flex items-center gap-1 text-base font-bold text-[var(--accent-hot)] hover:underline"
          >
            <ArrowRight size={18} />
            بازگشت به فهرست
          </Link>
          <h2 className="mt-3 text-[var(--text-2xl)] font-extrabold text-[var(--ink)]">
            {data.title}
          </h2>
          <p className="mt-2 text-base text-[var(--muted)]">{data.summary}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span className={`status-pill ${badge.cls}`}>{badge.text}</span>
            {applied && (
              <span>
                بازه: {toFaDigits(applied.from)} تا {toFaDigits(applied.to)}
              </span>
            )}
            <span>
              بروزرسانی: {toFaDigits(new Date(data.generatedAt).toLocaleString("fa-IR"))}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => downloadReportExcel(data)}
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => downloadReportXml(data)}
          >
            <FileCode2 size={18} />
            XML
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            disabled={refreshing}
            onClick={() => void load(applied || rangeDraft)}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            به‌روزرسانی
          </button>
          <HelpTip text="خروجی مطابق همین گزارش و بازه انتخابی است." />
        </div>
      </div>

      <DateRangeBar
        from={rangeDraft.from}
        to={rangeDraft.to}
        onChange={setRangeDraft}
        applying={refreshing}
        onApply={() => {
          if (!isValidRange(rangeDraft)) return;
          void load(rangeDraft);
        }}
      />

      {error && (
        <p className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a) => (
            <p
              key={a}
              className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-900"
            >
              {a}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <article
            key={k.label}
            className={`kpi-card ${k.tone ? `kpi-${k.tone}` : ""} animate-rise`}
          >
            <p className="text-base font-semibold text-[var(--muted)]">{k.label}</p>
            <p className="mt-2 text-[var(--text-xl)] font-extrabold">
              {formatKpi(k.value, k.format)}
            </p>
            {k.format === "money" && (
              <p className="mt-1 text-sm text-[var(--muted)]">{formatMoney(k.value)}</p>
            )}
            {k.hint && <p className="mt-1 text-sm text-[var(--muted)]">{k.hint}</p>}
          </article>
        ))}
      </div>

      <ReportOverviewChart
        data={data.series}
        label={data.seriesLabel}
        label2={data.seriesLabel2}
        label3={data.seriesLabel3}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <ReportBreakdownChart
          title={data.breakdownTitle || "ریز تفکیک"}
          data={data.breakdown}
        />
        <ReportBarsChart data={data.series} label={data.seriesLabel} />
      </div>

      {data.columns.length > 0 && (
        <section className="panel overflow-x-auto">
          <h3 className="mb-3 text-lg font-extrabold">جدول جزئیات</h3>
          <table className="data-table">
            <thead>
              <tr>
                {data.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr key={idx}>
                  {data.columns.map((c) => {
                    const v = row[c.key];
                    let text = String(v ?? "");
                    if (typeof v === "number") {
                      if (c.format === "money") text = formatMoney(v);
                      else if (c.format === "percent") text = `${toFaDigits(v)}٪`;
                      else text = formatNumber(v);
                    }
                    return <td key={c.key}>{text}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
