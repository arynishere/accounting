import type {
  AdapterResult,
  CategoryBreakdown,
  InventoryItem,
  MonthlyPoint,
  SourceConfig,
} from "../types";
import { getMockAdapterResult } from "../mock-data";
import { MONTH_LABELS } from "../format";
import type { DateRange } from "../date-range";
import { isValidRange } from "../date-range";

/**
 * آداپتر وب‌سرویس هلو (مستند holoostore.com/webserviceHelp.pdf)
 * Base: http://{IP}:8080/TncHoloo/api
 *
 *   POST /Login  body: { userinfo: { username, userpass: Base64(password), dbname } }
 *   GET  /Product
 *   GET  /Invoice?type=&date.from=&date.to=
 *   GET  /MainGroup  (اختیاری)
 *
 * نوع فاکتور (ثبت): 1 فروش · 2 برگشت فروش · 3 خرید · 4 برگشت خرید
 */

type HolooProduct = {
  Code?: string;
  Name?: string;
  Few?: string | number;
  BuyPrice?: string | number;
  SellPrice?: string | number;
  LastBuyPrice?: string | number;
  MainGroupName?: string;
  SideGroupName?: string;
  ErpCode?: string;
};

type HolooInvoice = {
  Code?: string;
  Type?: string | number;
  Date?: string;
  SumPrice?: string | number;
  SumDiscount?: string | number;
  CustomerName?: string;
  Detail?: Array<{
    ProductErpCode?: string;
    Few?: string | number;
    Price?: string | number;
    Name?: string;
    ProductName?: string;
    MainGroupName?: string;
  }>;
};

export async function fetchHelo(
  config: SourceConfig,
  range?: DateRange | null,
): Promise<AdapterResult> {
  if (!config.enabled) {
    return empty("disconnected");
  }

  if (config.useMock || !config.baseUrl) {
    return getMockAdapterResult("helo", range);
  }

  try {
    const base = trimSlash(config.baseUrl);
    const token = await loginHoloo(base, config);
    const headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const from = isValidRange(range)
      ? range.from
      : formatDate(shiftYears(-1));
    const to = isValidRange(range) ? range.to : formatDate(new Date());

    const [products, salesInvoices, purchaseInvoices] = await Promise.all([
      holooGet<{ product?: HolooProduct[] } | HolooProduct[]>(
        `${base}/Product`,
        headers,
      ),
      holooGet<{ invoice?: HolooInvoice[] } | HolooInvoice[]>(
        `${base}/Invoice?type=1&date.from=${from}&date.to=${to}`,
        headers,
      ).catch(() =>
        holooGet<{ invoice?: HolooInvoice[] } | HolooInvoice[]>(
          `${base}/Invoice?date.from=${from}&date.to=${to}`,
          headers,
        ),
      ),
      holooGet<{ invoice?: HolooInvoice[] } | HolooInvoice[]>(
        `${base}/Invoice?type=3&date.from=${from}&date.to=${to}`,
        headers,
      ).catch(() => ({ invoice: [] as HolooInvoice[] })),
    ]);

    const productList = asArray<HolooProduct>(products, "product");
    let salesList = asArray<HolooInvoice>(salesInvoices, "invoice");
    let purchaseList = asArray<HolooInvoice>(purchaseInvoices, "invoice");

    // اگر type فیلتر نشد، از فیلد Type جدا کن
    if (!purchaseList.length && salesList.some((i) => i.Type != null)) {
      const all = salesList;
      salesList = all.filter((i) => isSalesType(i.Type));
      purchaseList = all.filter((i) => isPurchaseType(i.Type));
    }

    const inventory = productList.map((p): InventoryItem => {
      const qty = num(p.Few);
      const unitCost = num(p.BuyPrice) || num(p.LastBuyPrice) || num(p.SellPrice);
      return {
        sku: p.Code ?? p.ErpCode ?? "-",
        name: p.Name ?? "—",
        category: p.MainGroupName || p.SideGroupName || "سایر",
        quantity: qty,
        value: Math.round(qty * unitCost),
        warehouse: "انبار هلو",
        source: "helo",
      };
    });

    const monthly = mergeMonthly(
      aggregateByMonth(salesList),
      aggregateByMonth(purchaseList),
    );

    return {
      source: "helo",
      status: "connected",
      monthly,
      salesByCategory: categoryFromInvoices(salesList, productList),
      purchasesByCategory: categoryFromInvoices(purchaseList, productList),
      inventory,
    };
  } catch (err) {
    return {
      ...getMockAdapterResult("helo"),
      status: "error",
      error: err instanceof Error ? err.message : "خطای ناشناخته هلو",
    };
  }
}

async function loginHoloo(base: string, config: SourceConfig): Promise<string> {
  if (config.apiKey && !config.apiKey.includes("•")) {
    return config.apiKey.startsWith("Bearer")
      ? config.apiKey
      : `Bearer ${config.apiKey}`;
  }

  if (!config.username || !config.password) {
    throw new Error("نام کاربری و رمز عبور هلو الزامی است");
  }
  if (!config.companyId && !config.dbName) {
    throw new Error("نام بانک اطلاعاتی هلو (dbname) الزامی است");
  }

  // طبق مستند: userpass به‌صورت Base64
  const plainPass = config.password;
  const userpass = isLikelyBase64(plainPass)
    ? plainPass
    : Buffer.from(plainPass, "utf8").toString("base64");

  const res = await fetch(`${base}/Login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      userinfo: {
        username: config.username,
        userpass,
        dbname: config.dbName || config.companyId,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`لاگین هلو ناموفق: HTTP ${res.status}`);
  }

  const data = await res.json();
  const login = data.Login ?? data.login ?? data;
  const state = String(login.State ?? login.state ?? "").toLowerCase();
  if (state === "false" || login.ErrorCode) {
    throw new Error(
      `لاگین هلو: ${login.Error || login.error || `کد ${login.ErrorCode}`}`,
    );
  }

  const token = login.Token ?? login.token;
  if (!token) throw new Error("توکن هلو دریافت نشد");
  return String(token).startsWith("Bearer")
    ? String(token)
    : `Bearer ${token}`;
}

async function holooGet<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`هلو ${url.split("/TncHoloo")[1] ?? url}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function asArray<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (Array.isArray(val)) return val as T[];
    if (val && typeof val === "object") return [val as T];
  }
  return [];
}

function aggregateByMonth(invoices: HolooInvoice[]): number[] {
  const totals = new Array(12).fill(0);
  for (const inv of invoices) {
    const idx = monthIndex(inv.Date);
    if (idx >= 0) totals[idx] += num(inv.SumPrice);
  }
  return totals;
}

function mergeMonthly(sales: number[], purchases: number[]): MonthlyPoint[] {
  return MONTH_LABELS.map((month, i) => ({
    month,
    sales: Math.round(sales[i] || 0),
    purchases: Math.round(purchases[i] || 0),
  }));
}

function categoryFromInvoices(
  invoices: HolooInvoice[],
  products: HolooProduct[],
): CategoryBreakdown[] {
  const productGroup = new Map(
    products.map((p) => [
      p.ErpCode ?? "",
      p.MainGroupName || p.SideGroupName || "سایر",
    ]),
  );
  const map = new Map<string, CategoryBreakdown>();

  for (const inv of invoices) {
    if (inv.Detail?.length) {
      for (const line of inv.Detail) {
        const category =
          line.MainGroupName ||
          productGroup.get(line.ProductErpCode ?? "") ||
          "سایر";
        const prev = map.get(category) ?? {
          category,
          amount: 0,
          quantity: 0,
        };
        const lineAmount = num(line.Price) * (num(line.Few) || 1);
        prev.amount += lineAmount || num(inv.SumPrice) / inv.Detail.length;
        prev.quantity += num(line.Few) || 1;
        map.set(category, prev);
      }
    } else {
      const category = inv.CustomerName
        ? `طرف‌حساب: ${inv.CustomerName}`
        : "فاکتور هلو";
      const prev = map.get(category) ?? {
        category,
        amount: 0,
        quantity: 0,
      };
      prev.amount += num(inv.SumPrice);
      prev.quantity += 1;
      map.set(category, prev);
    }
  }

  return [...map.values()]
    .map((r) => ({ ...r, amount: Math.round(r.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);
}

function isSalesType(type: string | number | undefined): boolean {
  const t = String(type ?? "").trim();
  return t === "1" || /فروش/i.test(t);
}

function isPurchaseType(type: string | number | undefined): boolean {
  const t = String(type ?? "").trim();
  return t === "3" || /خرید/i.test(t);
}

function monthIndex(dateStr?: string): number {
  if (!dateStr) return -1;
  const normalized = dateStr.replace(/-/g, "/");
  const parts = normalized.split(/[^\d]/).filter(Boolean);
  if (parts.length < 3) return -1;

  // تاریخ هلو معمولاً میلادی yyyy/mm/dd است
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return -1;

  try {
    const date = new Date(y, m - 1, d);
    const name = date.toLocaleDateString("fa-IR", { month: "long" });
    return MONTH_LABELS.findIndex((label) => name.includes(label));
  } catch {
    return -1;
  }
}

function num(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftYears(delta: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + delta);
  return d;
}

function isLikelyBase64(value: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(value) && value.length % 4 === 0 && value.length >= 4;
}

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function empty(status: AdapterResult["status"]): AdapterResult {
  return {
    source: "helo",
    status,
    monthly: [],
    salesByCategory: [],
    purchasesByCategory: [],
    inventory: [],
  };
}
