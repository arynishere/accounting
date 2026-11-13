import type {
  AdapterResult,
  CategoryBreakdown,
  DataSource,
  InventoryItem,
  MonthlyPoint,
} from "./types";
import { MONTH_LABELS } from "./format";
import type { DateRange } from "./date-range";
import {
  isValidRange,
  persianMonthIndicesInRange,
} from "./date-range";

function monthlyFor(source: DataSource): MonthlyPoint[] {
  const seed =
    source === "crm" ? 1.0 : source === "helo" ? 0.85 : 1.15;
  return MONTH_LABELS.map((month, i) => {
    const wave = 0.7 + Math.sin(i / 2) * 0.25 + (i % 3) * 0.05;
    return {
      month,
      sales: Math.round(420_000_000 * seed * wave),
      purchases: Math.round(280_000_000 * seed * (wave - 0.08)),
    };
  });
}

function salesCats(source: DataSource): CategoryBreakdown[] {
  const mult = source === "sepidar" ? 1.2 : source === "helo" ? 0.9 : 1;
  return [
    { category: "لوازم الکترونیکی", amount: Math.round(980_000_000 * mult), quantity: 420 },
    { category: "مواد غذایی", amount: Math.round(640_000_000 * mult), quantity: 2100 },
    { category: "پوشاک", amount: Math.round(410_000_000 * mult), quantity: 890 },
    { category: "لوازم خانگی", amount: Math.round(520_000_000 * mult), quantity: 310 },
    { category: "سایر", amount: Math.round(180_000_000 * mult), quantity: 150 },
  ];
}

function purchaseCats(source: DataSource): CategoryBreakdown[] {
  const mult = source === "sepidar" ? 1.1 : source === "helo" ? 0.95 : 1;
  return [
    { category: "لوازم الکترونیکی", amount: Math.round(620_000_000 * mult), quantity: 380 },
    { category: "مواد غذایی", amount: Math.round(490_000_000 * mult), quantity: 2400 },
    { category: "پوشاک", amount: Math.round(260_000_000 * mult), quantity: 720 },
    { category: "لوازم خانگی", amount: Math.round(340_000_000 * mult), quantity: 280 },
    { category: "سایر", amount: Math.round(110_000_000 * mult), quantity: 95 },
  ];
}

function inventoryFor(source: DataSource): InventoryItem[] {
  const base: Omit<InventoryItem, "source">[] = [
    {
      sku: "EL-1001",
      name: "گوشی هوشمند A15",
      category: "لوازم الکترونیکی",
      quantity: 86,
      value: 4_300_000_000,
      warehouse: "انبار مرکزی",
    },
    {
      sku: "EL-2044",
      name: "لپ‌تاپ اداری",
      category: "لوازم الکترونیکی",
      quantity: 34,
      value: 2_720_000_000,
      warehouse: "انبار مرکزی",
    },
    {
      sku: "FD-3310",
      name: "روغن خوراکی ۵ لیتری",
      category: "مواد غذایی",
      quantity: 1200,
      value: 540_000_000,
      warehouse: "انبار غرب",
    },
    {
      sku: "CL-1102",
      name: "کت مردانه زمستانی",
      category: "پوشاک",
      quantity: 210,
      value: 630_000_000,
      warehouse: "انبار شمال",
    },
    {
      sku: "HM-5501",
      name: "جاروبرقی بدون کیسه",
      category: "لوازم خانگی",
      quantity: 58,
      value: 870_000_000,
      warehouse: "انبار مرکزی",
    },
    {
      sku: "HM-7720",
      name: "مایکروویو دیجیتال",
      category: "لوازم خانگی",
      quantity: 41,
      value: 492_000_000,
      warehouse: "انبار شرق",
    },
  ];

  const factor = source === "crm" ? 0.6 : source === "helo" ? 1 : 1.15;
  return base.map((item, idx) => ({
    ...item,
    quantity: Math.round(item.quantity * factor * (0.85 + (idx % 3) * 0.1)),
    value: Math.round(item.value * factor * (0.85 + (idx % 3) * 0.1)),
    source,
  }));
}

export function getMockAdapterResult(
  source: DataSource,
  range?: DateRange | null,
): AdapterResult {
  let monthly = monthlyFor(source);
  let salesByCategory = salesCats(source);
  let purchasesByCategory = purchaseCats(source);

  if (isValidRange(range)) {
    const indices = new Set(persianMonthIndicesInRange(range));
    const kept = monthly.filter((_, i) => indices.has(i));
    const fullSales = monthly.reduce((s, m) => s + m.sales, 0);
    const keptSales = kept.reduce((s, m) => s + m.sales, 0);
    const ratio = fullSales > 0 ? keptSales / fullSales : 0;
    monthly = MONTH_LABELS.map((month, i) =>
      indices.has(i)
        ? monthly[i]
        : { month, sales: 0, purchases: 0 },
    );
    salesByCategory = salesByCategory.map((r) => ({
      ...r,
      amount: Math.round(r.amount * ratio),
      quantity: Math.round(r.quantity * ratio),
    }));
    purchasesByCategory = purchasesByCategory.map((r) => ({
      ...r,
      amount: Math.round(r.amount * ratio),
      quantity: Math.round(r.quantity * ratio),
    }));
  }

  return {
    source,
    status: "mock",
    monthly,
    salesByCategory,
    purchasesByCategory,
    inventory: inventoryFor(source),
  };
}
