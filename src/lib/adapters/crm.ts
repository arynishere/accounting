import type { AdapterResult, SourceConfig } from "../types";
import { getMockAdapterResult } from "../mock-data";
import { MONTH_LABELS } from "../format";

/**
 * Generic CRM REST adapter.
 * Expected endpoints (customize to your CRM):
 *   GET {baseUrl}/reports/sales?period=year
 *   GET {baseUrl}/reports/purchases?period=year
 *   GET {baseUrl}/inventory
 * Auth: Bearer {apiKey}
 */
export async function fetchCrm(config: SourceConfig): Promise<AdapterResult> {
  if (!config.enabled) {
    return {
      source: "crm",
      status: "disconnected",
      monthly: [],
      salesByCategory: [],
      purchasesByCategory: [],
      inventory: [],
    };
  }

  if (config.useMock || !config.baseUrl || !config.apiKey) {
    return getMockAdapterResult("crm");
  }

  try {
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const [salesRes, purchasesRes, invRes] = await Promise.all([
      fetch(`${config.baseUrl}/reports/sales?period=year`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${config.baseUrl}/reports/purchases?period=year`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${config.baseUrl}/inventory`, { headers, cache: "no-store" }),
    ]);

    if (!salesRes.ok || !purchasesRes.ok || !invRes.ok) {
      throw new Error(
        `CRM HTTP ${salesRes.status}/${purchasesRes.status}/${invRes.status}`,
      );
    }

    const sales = await salesRes.json();
    const purchases = await purchasesRes.json();
    const inventory = await invRes.json();

    const monthly = MONTH_LABELS.map((month, i) => ({
      month,
      sales: Number(sales.monthly?.[i]?.amount ?? sales.months?.[i] ?? 0),
      purchases: Number(
        purchases.monthly?.[i]?.amount ?? purchases.months?.[i] ?? 0,
      ),
    }));

    return {
      source: "crm",
      status: "connected",
      monthly,
      salesByCategory: (sales.byCategory ?? []).map(
        (c: { name?: string; category?: string; amount: number; qty?: number }) => ({
          category: c.category ?? c.name ?? "نامشخص",
          amount: Number(c.amount),
          quantity: Number(c.qty ?? 0),
        }),
      ),
      purchasesByCategory: (purchases.byCategory ?? []).map(
        (c: { name?: string; category?: string; amount: number; qty?: number }) => ({
          category: c.category ?? c.name ?? "نامشخص",
          amount: Number(c.amount),
          quantity: Number(c.qty ?? 0),
        }),
      ),
      inventory: (inventory.items ?? inventory ?? []).map(
        (item: {
          sku?: string;
          code?: string;
          name: string;
          category?: string;
          quantity?: number;
          qty?: number;
          value?: number;
          warehouse?: string;
        }) => ({
          sku: item.sku ?? item.code ?? "-",
          name: item.name,
          category: item.category ?? "سایر",
          quantity: Number(item.quantity ?? item.qty ?? 0),
          value: Number(item.value ?? 0),
          warehouse: item.warehouse ?? "—",
          source: "crm" as const,
        }),
      ),
    };
  } catch (err) {
    return {
      ...getMockAdapterResult("crm"),
      status: "error",
      error: err instanceof Error ? err.message : "خطای ناشناخته CRM",
    };
  }
}
