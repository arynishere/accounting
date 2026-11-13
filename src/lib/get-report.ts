import type { DateRange } from "./date-range";
import { isValidRange } from "./date-range";
import { getDashboardData } from "./get-dashboard";
import { loadConfig } from "./config";
import { buildMockReport } from "./mock-reports";
import { getReport } from "./reports-catalog";
import type { ReportPayload } from "./report-types";

/** ساخت payload گزارش — mock یا hybrid با داده زنده داشبورد */
export async function getReportPayload(
  id: string,
  range?: DateRange | null,
): Promise<ReportPayload | null> {
  const def = getReport(id);
  if (!def) return null;

  const mock = buildMockReport(id, range);
  if (!mock) return null;

  if (def.dataMode === "mock") return mock;

  // hybrid / live: غنی‌سازی از داشبورد واقعی در صورت امکان
  try {
    const valid = isValidRange(range) ? range : null;
    const dash = await getDashboardData(false, valid);
    const config = await loadConfig();
    const target =
      Number(config.salesTarget) || Math.round(dash.totals.sales * 1.15);

    if (id === "actual-vs-target") {
      const sales = dash.totals.sales;
      const pct = target ? Math.round((sales / target) * 1000) / 10 : 0;
      const prevApprox = Math.round(sales / 1.12);
      const growth =
        prevApprox > 0
          ? Math.round(((sales - prevApprox) / prevApprox) * 1000) / 10
          : 0;
      return {
        ...mock,
        dataMode: "hybrid",
        dateFrom: dash.dateFrom ?? valid?.from,
        dateTo: dash.dateTo ?? valid?.to,
        generatedAt: dash.generatedAt,
        kpis: [
          { label: "فروش خالص", value: sales, format: "money", tone: "sales" },
          { label: "هدف دوره", value: target, format: "money", tone: "buy" },
          { label: "درصد تحقق", value: pct, format: "percent", tone: "profit" },
          {
            label: "فاصله تا هدف",
            value: target - sales,
            format: "money",
            tone: "warn",
          },
          {
            label: "رشد تقریبی دوره مشابه",
            value: growth,
            format: "percent",
            tone: "stock",
          },
        ],
        series: dash.monthly.map((m) => ({
          label: m.month,
          value: m.sales,
          value2: Math.round(target / Math.max(dash.monthly.length, 1)),
        })),
        seriesLabel: "فروش واقعی",
        seriesLabel2: "هدف ماهانه تقریبی",
        breakdown: dash.salesByCategory.slice(0, 8).map((c) => ({
          label: c.category,
          value: c.amount,
        })),
        breakdownTitle: "فروش به تفکیک گروه",
        rows: dash.monthly.map((m) => {
          const monthTarget = Math.round(
            target / Math.max(dash.monthly.length, 1),
          );
          return {
            month: m.month,
            sales: m.sales,
            target: monthTarget,
            pct: monthTarget
              ? Math.round((m.sales / monthTarget) * 1000) / 10
              : 0,
          };
        }),
      };
    }

    if (id === "sales-mix") {
      return {
        ...mock,
        dataMode: "hybrid",
        generatedAt: dash.generatedAt,
        dateFrom: dash.dateFrom ?? valid?.from,
        dateTo: dash.dateTo ?? valid?.to,
        kpis: [
          {
            label: "جمع فروش گروهی",
            value: dash.totals.sales,
            format: "money",
            tone: "sales",
          },
          {
            label: "تعداد گروه",
            value: dash.salesByCategory.length,
            format: "number",
          },
        ],
        series: dash.salesByCategory.slice(0, 8).map((c) => ({
          label: c.category,
          value: c.amount,
          value2: Math.round(c.amount * 0.08),
        })),
        breakdown: dash.salesByCategory.slice(0, 8).map((c) => ({
          label: c.category,
          value: c.amount,
        })),
        rows: dash.salesByCategory.slice(0, 12).map((c) => ({
          category: c.category,
          sales: c.amount,
          discount: Math.round(c.amount * 0.08),
          return: Math.round(c.amount * 0.03),
          share:
            dash.totals.sales > 0
              ? Math.round((c.amount / dash.totals.sales) * 1000) / 10
              : 0,
        })),
      };
    }

    if (id === "revenue-breakdown") {
      return {
        ...mock,
        dataMode: "hybrid",
        generatedAt: dash.generatedAt,
        dateFrom: dash.dateFrom ?? valid?.from,
        dateTo: dash.dateTo ?? valid?.to,
        kpis: [
          {
            label: "جمع درآمد/فروش",
            value: dash.totals.sales,
            format: "money",
            tone: "sales",
          },
        ],
        series: dash.salesByCategory.slice(0, 8).map((c) => ({
          label: c.category,
          value: c.amount,
        })),
        breakdown: dash.sources
          .filter((s) => s.status !== "disconnected")
          .map((s) => ({ label: s.label, value: s.totalSales })),
        breakdownTitle: "فروش به تفکیک منبع",
        rows: [
          ...dash.salesByCategory.slice(0, 8).map((c) => ({
            dim: "محصول/گروه",
            name: c.category,
            amount: c.amount,
            seller: "—",
          })),
          ...dash.sources
            .filter((s) => s.status !== "disconnected")
            .map((s) => ({
              dim: "منبع",
              name: s.label,
              amount: s.totalSales,
              seller: "—",
            })),
        ],
      };
    }
  } catch {
    // fall through to mock
  }

  return mock;
}
