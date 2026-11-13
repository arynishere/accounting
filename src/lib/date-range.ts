import { MONTH_LABELS } from "./format";
import type { DashboardData, MonthlyPoint } from "./types";

export type DateRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

export function todayIso(): string {
  return formatIso(new Date());
}

export function formatIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function shiftDays(days: number, base = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return formatIso(d);
}

export function startOfYearIso(base = new Date()): string {
  return `${base.getFullYear()}-01-01`;
}

export function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isValidRange(range: DateRange | null | undefined): range is DateRange {
  if (!range?.from || !range?.to) return false;
  const a = parseIso(range.from);
  const b = parseIso(range.to);
  if (!a || !b) return false;
  return a.getTime() <= b.getTime();
}

/** آیا تاریخ متنی فاکتور داخل بازه است؟ */
export function dateInRange(
  raw: string | null | undefined,
  range?: DateRange | null,
): boolean {
  if (!range || !isValidRange(range)) return true;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) {
    // تلاش برای YYYY/MM/DD یا YYYY-MM-DD
    const m = String(raw).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!m) return true;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    if (Number.isNaN(d.getTime())) return true;
    return within(d, range);
  }
  return within(new Date(t), range);
}

function within(d: Date, range: DateRange): boolean {
  const from = parseIso(range.from)!;
  const to = parseIso(range.to)!;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

/**
 * اندیس ماه‌های شمسی که با بازه میلادی هم‌پوشانی دارند
 * (برای فیلتر داده mock / ماهانه ۱۲تایی)
 */
export function persianMonthIndicesInRange(range: DateRange): number[] {
  const from = parseIso(range.from);
  const to = parseIso(range.to);
  if (!from || !to) return MONTH_LABELS.map((_, i) => i);

  const hit = new Set<number>();
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  const end = to.getTime();
  // گام حدود ۱۰ روزه کافی است تا همه ماه‌های شمسی بازه را بگیریم
  while (cursor.getTime() <= end) {
    const name = cursor.toLocaleDateString("fa-IR", { month: "long" });
    const idx = MONTH_LABELS.findIndex(
      (m) => name.includes(m) || m.includes(name),
    );
    if (idx >= 0) hit.add(idx);
    cursor.setDate(cursor.getDate() + 10);
  }
  // نقطه پایانی
  const endName = to.toLocaleDateString("fa-IR", { month: "long" });
  const endIdx = MONTH_LABELS.findIndex(
    (m) => endName.includes(m) || m.includes(endName),
  );
  if (endIdx >= 0) hit.add(endIdx);

  const list = [...hit].sort((a, b) => a - b);
  return list.length ? list : MONTH_LABELS.map((_, i) => i);
}

export function filterMonthlyByIndices(
  monthly: MonthlyPoint[],
  indices: number[] | null,
): MonthlyPoint[] {
  if (!indices || indices.length === 0) return monthly;
  const set = new Set(indices);
  return monthly.filter((_, i) => set.has(i));
}

/** برش داشبورد برای نمایش/خروجی روی بازه ماه‌های انتخاب‌شده */
export function sliceDashboard(
  data: DashboardData,
  monthIndices: number[] | null,
  range?: DateRange | null,
): DashboardData {
  const monthly = filterMonthlyByIndices(data.monthly, monthIndices);
  const sales = monthly.reduce((s, m) => s + m.sales, 0);
  const purchases = monthly.reduce((s, m) => s + m.purchases, 0);
  const ratio =
    data.totals.sales > 0 ? sales / data.totals.sales : monthIndices ? 0 : 1;

  const scaleCats = (rows: DashboardData["salesByCategory"]) =>
    monthIndices
      ? rows.map((r) => ({
          ...r,
          amount: Math.round(r.amount * ratio),
          quantity: Math.round(r.quantity * ratio),
        }))
      : rows;

  return {
    ...data,
    monthly,
    salesByCategory: scaleCats(data.salesByCategory),
    purchasesByCategory: scaleCats(data.purchasesByCategory),
    totals: {
      ...data.totals,
      sales,
      purchases,
      profit: sales - purchases,
    },
    dateFrom: range?.from ?? data.dateFrom,
    dateTo: range?.to ?? data.dateTo,
  };
}

export const DATE_PRESETS: { id: string; label: string; range: () => DateRange }[] =
  [
    {
      id: "30d",
      label: "۳۰ روز",
      range: () => ({ from: shiftDays(-30), to: todayIso() }),
    },
    {
      id: "90d",
      label: "۳ ماه",
      range: () => ({ from: shiftDays(-90), to: todayIso() }),
    },
    {
      id: "180d",
      label: "۶ ماه",
      range: () => ({ from: shiftDays(-180), to: todayIso() }),
    },
    {
      id: "ytd",
      label: "امسال",
      range: () => ({ from: startOfYearIso(), to: todayIso() }),
    },
  ];
