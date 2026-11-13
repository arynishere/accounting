import type { DashboardData, MonthlyPoint, CategoryBreakdown } from "./types";

export type MetricKey = "sales" | "purchases" | "profit" | "stock";

export const METRIC_META: Record<
  MetricKey,
  {
    title: string;
    subtitle: string;
    color: string;
    help: string;
  }
> = {
  sales: {
    title: "جزئیات فروش",
    subtitle: "نمودار کلی ماهانه + ریز به تفکیک گروه کالا و منبع",
    color: "#ea580c",
    help: "فروش تجمیعی از CRM، هلو و سپیدار در بازه انتخاب‌شده",
  },
  purchases: {
    title: "جزئیات خرید",
    subtitle: "نمودار کلی ماهانه + ریز به تفکیک گروه کالا و منبع",
    color: "#dc2626",
    help: "خرید تجمیعی از منابع متصل در بازه انتخاب‌شده",
  },
  profit: {
    title: "جزئیات سود ناخالص",
    subtitle: "مقایسه فروش و خرید ماهانه + حاشیه تقریبی",
    color: "#c2410c",
    help: "سود تقریبی = فروش − خرید (بدون هزینه‌های عملیاتی)",
  },
  stock: {
    title: "جزئیات موجودی",
    subtitle: "ارزش انبار به تفکیک گروه و منبع",
    color: "#991b1b",
    help: "ارزش ریالی موجودی کالا در لحظه همگام‌سازی",
  },
};

export function isMetricKey(value: string): value is MetricKey {
  return value in METRIC_META;
}

export function metricTotal(data: DashboardData, metric: MetricKey): number {
  switch (metric) {
    case "sales":
      return data.totals.sales;
    case "purchases":
      return data.totals.purchases;
    case "profit":
      return data.totals.profit;
    case "stock":
      return data.totals.inventoryValue;
  }
}

export function metricMonthly(
  data: DashboardData,
  metric: MetricKey,
): Array<{ month: string; value: number; sales?: number; purchases?: number }> {
  if (metric === "stock") {
    // موجودی سری زمانی ماهانه ندارد — یک نقطه تجمیعی نشان می‌دهیم
    return [{ month: "موجودی فعلی", value: data.totals.inventoryValue }];
  }
  return data.monthly.map((m: MonthlyPoint) => {
    if (metric === "sales") return { month: m.month, value: m.sales };
    if (metric === "purchases") return { month: m.month, value: m.purchases };
    return {
      month: m.month,
      value: m.sales - m.purchases,
      sales: m.sales,
      purchases: m.purchases,
    };
  });
}

export function metricCategories(
  data: DashboardData,
  metric: MetricKey,
): CategoryBreakdown[] {
  if (metric === "sales") return data.salesByCategory;
  if (metric === "purchases") return data.purchasesByCategory;
  if (metric === "stock") return data.inventoryByCategory;
  // سود: تفاوت تقریبی فروش و خرید به ازای گروه مشترک
  const buyMap = new Map(
    data.purchasesByCategory.map((r) => [r.category, r.amount]),
  );
  const cats = new Map<string, CategoryBreakdown>();
  for (const row of data.salesByCategory) {
    const buy = buyMap.get(row.category) ?? 0;
    cats.set(row.category, {
      category: row.category,
      amount: row.amount - buy,
      quantity: row.quantity,
    });
  }
  for (const row of data.purchasesByCategory) {
    if (!cats.has(row.category)) {
      cats.set(row.category, {
        category: row.category,
        amount: -row.amount,
        quantity: row.quantity,
      });
    }
  }
  return [...cats.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export function metricBySource(
  data: DashboardData,
  metric: MetricKey,
): CategoryBreakdown[] {
  return data.sources
    .filter((s) => s.status !== "disconnected")
    .map((s) => {
      let amount = 0;
      if (metric === "sales") amount = s.totalSales;
      else if (metric === "purchases") amount = s.totalPurchases;
      else if (metric === "profit") amount = s.totalSales - s.totalPurchases;
      else amount = s.inventoryValue;
      return {
        category: s.label,
        amount,
        quantity: metric === "stock" ? s.inventoryCount : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}
