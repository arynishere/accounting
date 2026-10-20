import type {
  AdapterResult,
  AppConfig,
  CategoryBreakdown,
  DashboardData,
  MonthlyPoint,
  SourceMetrics,
} from "../types";
import { fetchCrm } from "./crm";
import { fetchHelo } from "./helo";
import { fetchSepidar } from "./sepidar";
import { MONTH_LABELS } from "../format";

const LABELS = {
  crm: "CRM",
  helo: "هلو",
  sepidar: "سپیدار",
} as const;

function mergeMonthly(results: AdapterResult[]): MonthlyPoint[] {
  return MONTH_LABELS.map((month, i) => ({
    month,
    sales: results.reduce((sum, r) => sum + (r.monthly[i]?.sales ?? 0), 0),
    purchases: results.reduce(
      (sum, r) => sum + (r.monthly[i]?.purchases ?? 0),
      0,
    ),
  }));
}

function mergeCategories(
  results: AdapterResult[],
  key: "salesByCategory" | "purchasesByCategory",
): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  for (const result of results) {
    for (const row of result[key]) {
      const prev = map.get(row.category) ?? {
        category: row.category,
        amount: 0,
        quantity: 0,
      };
      prev.amount += row.amount;
      prev.quantity += row.quantity;
      map.set(row.category, prev);
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function inventoryByCategory(results: AdapterResult[]): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  for (const result of results) {
    for (const item of result.inventory) {
      const prev = map.get(item.category) ?? {
        category: item.category,
        amount: 0,
        quantity: 0,
      };
      prev.amount += item.value;
      prev.quantity += item.quantity;
      map.set(item.category, prev);
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function toMetrics(result: AdapterResult): SourceMetrics {
  const totalSales = result.monthly.reduce((s, m) => s + m.sales, 0);
  const totalPurchases = result.monthly.reduce((s, m) => s + m.purchases, 0);
  const inventoryValue = result.inventory.reduce((s, i) => s + i.value, 0);
  const inventoryCount = result.inventory.reduce((s, i) => s + i.quantity, 0);

  return {
    source: result.source,
    status: result.status,
    label: LABELS[result.source],
    totalSales,
    totalPurchases,
    inventoryValue,
    inventoryCount,
    lastSync:
      result.status === "disconnected"
        ? null
        : new Date().toISOString(),
    error: result.error,
  };
}

export async function buildDashboard(config: AppConfig): Promise<DashboardData> {
  const results = await Promise.all([
    fetchCrm(config.crm),
    fetchHelo(config.helo),
    fetchSepidar(config.sepidar),
  ]);

  const active = results.filter((r) => r.status !== "disconnected");
  const monthly = mergeMonthly(active);
  const inventory = active.flatMap((r) => r.inventory);
  const totalSales = monthly.reduce((s, m) => s + m.sales, 0);
  const totalPurchases = monthly.reduce((s, m) => s + m.purchases, 0);
  const inventoryValue = inventory.reduce((s, i) => s + i.value, 0);
  const inventoryUnits = inventory.reduce((s, i) => s + i.quantity, 0);

  return {
    sources: results.map(toMetrics),
    monthly,
    salesByCategory: mergeCategories(active, "salesByCategory"),
    purchasesByCategory: mergeCategories(active, "purchasesByCategory"),
    inventoryByCategory: inventoryByCategory(active),
    inventory: inventory.sort((a, b) => b.value - a.value),
    totals: {
      sales: totalSales,
      purchases: totalPurchases,
      inventoryValue,
      inventoryUnits,
      profit: totalSales - totalPurchases,
    },
    generatedAt: new Date().toISOString(),
  };
}
