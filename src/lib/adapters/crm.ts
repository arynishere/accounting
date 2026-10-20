import type {
  AdapterResult,
  CategoryBreakdown,
  InventoryItem,
  MonthlyPoint,
  SourceConfig,
} from "../types";
import { getMockAdapterResult } from "../mock-data";
import { MONTH_LABELS } from "../format";

/**
 * آداپتر CRM پیام‌گستر (PayamGostar) — وب‌سرویس‌های WCF/SOAP
 *
 * Base پیشنهادی: https://{host}  یا  https://{host}/Services/API
 *
 * سرویس‌های استفاده‌شده:
 *   IUser/CheckUserAuthentication
 *   IInvoice/SearchInvoice
 *   IInvoice/SearchPurchaseInvoice
 *   IProduct/FindProductByCode
 *   IInventory/GetRemainingStock
 *
 * توجه: PDF نسخه Customer 2.5.1 فقط Release Notes است؛ قرارداد API از WSDL رسمی
 * روی /Services/API/*.svc گرفته شده است.
 */

type SoapInvoice = {
  totalValue: number;
  invoiceDate?: string;
  invoiceType?: string;
  details: Array<{
    productCode?: string;
    productName?: string;
    inventoryName?: string;
    count: number;
    totalUnitPrice: number;
    finalUnitPrice: number;
  }>;
};

export async function fetchCrm(config: SourceConfig): Promise<AdapterResult> {
  if (!config.enabled) {
    return empty("disconnected");
  }

  if (config.useMock || !config.baseUrl) {
    return getMockAdapterResult("crm");
  }

  // اگر هنوز endpoint عمومی REST قدیمی تنظیم شده باشد
  if (config.crmDialect === "rest") {
    return fetchGenericRest(config);
  }

  try {
    const apiBase = resolveApiBase(config.baseUrl);
    const user = config.username ?? "";
    const pass = config.password ?? "";
    if (!user || !pass) {
      throw new Error("نام کاربری و رمز عبور پیام‌گستر الزامی است");
    }

    // اعتبارسنجی اختیاری
    await soapCall(
      apiBase,
      "IUser",
      "CheckUserAuthentication",
      `<userName>${xml(user)}</userName><password>${xml(pass)}</password>`,
    ).catch(() => null);

    const query = config.crmQuery?.trim() || "";
    const typeKey = config.crmTypeKey?.trim() || "";

    const [salesXml, purchaseXml] = await Promise.all([
      soapCall(
        apiBase,
        "IInvoice",
        "SearchInvoice",
        `<userName>${xml(user)}</userName><password>${xml(pass)}</password><typeKey>${xml(typeKey)}</typeKey><query>${xml(query)}</query>`,
      ),
      soapCall(
        apiBase,
        "IInvoice",
        "SearchPurchaseInvoice",
        `<userName>${xml(user)}</userName><password>${xml(pass)}</password><typeKey>${xml(typeKey)}</typeKey><query>${xml(query)}</query>`,
      ).catch(() => ""),
    ]);

    const sales = parseInvoices(salesXml, "SearchInvoiceResult");
    const purchases = parseInvoices(purchaseXml, "SearchPurchaseInvoiceResult");

    const productCodes = new Set<string>();
    for (const inv of [...sales, ...purchases]) {
      for (const d of inv.details) {
        if (d.productCode) productCodes.add(d.productCode);
      }
    }

    const inventory = await buildInventory(
      apiBase,
      user,
      pass,
      [...productCodes].slice(0, 40),
    );

    return {
      source: "crm",
      status: "connected",
      monthly: mergeMonthly(sales, purchases),
      salesByCategory: categoriesFromInvoices(sales),
      purchasesByCategory: categoriesFromInvoices(purchases),
      inventory,
    };
  } catch (err) {
    return {
      ...getMockAdapterResult("crm"),
      status: "error",
      error: err instanceof Error ? err.message : "خطای ناشناخته پیام‌گستر",
    };
  }
}

async function buildInventory(
  apiBase: string,
  user: string,
  pass: string,
  codes: string[],
): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];

  // حداکثر ۳ درخواست موازی برای کاهش فشار CPU/شبکه
  const concurrency = 3;
  for (let i = 0; i < codes.length; i += concurrency) {
    const chunk = codes.slice(i, i + concurrency);
    const chunkItems = await Promise.all(
      chunk.map(async (code) => {
        try {
          const [stockXml, productXml] = await Promise.all([
            soapCall(
              apiBase,
              "IInventory",
              "GetRemainingStock",
              `<userName>${xml(user)}</userName><password>${xml(pass)}</password><productCode>${xml(code)}</productCode>`,
            ),
            soapCall(
              apiBase,
              "IProduct",
              "FindProductByCode",
              `<userName>${xml(user)}</userName><password>${xml(pass)}</password><code>${xml(code)}</code><groupName></groupName>`,
            ).catch(() => ""),
          ]);

          const stocks = parseStock(stockXml);
          const product = parseProduct(productXml);
          const qty = stocks.reduce((s, r) => s + r.qty, 0);
          const unit = product?.unitBuyPrice || product?.unitPrice || 0;
          const warehouse =
            stocks.map((s) => s.name).filter(Boolean).join("، ") || "انبار CRM";

          return {
            sku: code,
            name: product?.name || code,
            category: product?.groupName || "محصولات CRM",
            quantity: qty,
            value: Math.round(qty * unit),
            warehouse,
            source: "crm" as const,
          };
        } catch {
          return null;
        }
      }),
    );
    for (const row of chunkItems) {
      if (row) items.push(row);
    }
  }

  return items.sort((a, b) => b.value - a.value);
}

function mergeMonthly(
  sales: SoapInvoice[],
  purchases: SoapInvoice[],
): MonthlyPoint[] {
  const s = new Array(12).fill(0);
  const p = new Array(12).fill(0);
  for (const inv of sales) {
    const i = monthIndex(inv.invoiceDate);
    if (i >= 0) s[i] += inv.totalValue;
  }
  for (const inv of purchases) {
    const i = monthIndex(inv.invoiceDate);
    if (i >= 0) p[i] += inv.totalValue;
  }
  return MONTH_LABELS.map((month, i) => ({
    month,
    sales: Math.round(s[i]),
    purchases: Math.round(p[i]),
  }));
}

function categoriesFromInvoices(invoices: SoapInvoice[]): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  for (const inv of invoices) {
    if (inv.details.length) {
      for (const d of inv.details) {
        const category = d.productName || d.productCode || "سایر";
        const prev = map.get(category) ?? {
          category,
          amount: 0,
          quantity: 0,
        };
        prev.amount += d.totalUnitPrice || d.finalUnitPrice * d.count;
        prev.quantity += d.count;
        map.set(category, prev);
      }
    } else {
      const category = inv.invoiceType || "فاکتور CRM";
      const prev = map.get(category) ?? { category, amount: 0, quantity: 0 };
      prev.amount += inv.totalValue;
      prev.quantity += 1;
      map.set(category, prev);
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, amount: Math.round(r.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);
}

async function soapCall(
  apiBase: string,
  service: string,
  method: string,
  bodyInner: string,
): Promise<string> {
  const url = `${apiBase}/${service}.svc`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <${method} xmlns="http://tempuri.org/">
      ${bodyInner}
    </${method}>
  </s:Body>
</s:Envelope>`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/${service}/${method}"`,
      Accept: "text/xml",
    },
    body: envelope,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`پیام‌گستر ${service}.${method}: HTTP ${res.status}`);
  }
  if (text.includes("Fault>") || text.includes(":Fault")) {
    const msg =
      text.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i)?.[1] ||
      text.match(/<Message[^>]*>([^<]+)<\/Message>/i)?.[1] ||
      "SOAP Fault";
    throw new Error(`پیام‌گستر ${method}: ${msg}`);
  }
  return text;
}

function parseInvoices(xmlText: string, resultTag: string): SoapInvoice[] {
  if (!xmlText) return [];
  // نتیجه ممکن است لیست یا تک‌آیتم باشد
  const listChunk =
    extractTag(xmlText, "InvoiceInfoList") ||
    extractTag(xmlText, resultTag) ||
    xmlText;

  const blocks = splitByTag(listChunk, "InvoiceInfo");
  return blocks.map((block) => {
    const details = splitByTag(block, "InvoiceDetailInfo").map((d) => ({
      productCode: textOf(d, "ProductCode"),
      productName: textOf(d, "ProductName"),
      inventoryName: textOf(d, "InventoryName"),
      count: num(textOf(d, "Count")),
      totalUnitPrice: num(textOf(d, "TotalUnitPrice")),
      finalUnitPrice: num(textOf(d, "FinalUnitPrice")),
    }));
    return {
      totalValue: num(textOf(block, "TotalValue")),
      invoiceDate: textOf(block, "InvoiceDate"),
      invoiceType: textOf(block, "InvoiceType"),
      details,
    };
  });
}

function parseStock(xmlText: string): Array<{ name: string; qty: number }> {
  const blocks = splitByTag(xmlText, "InventoryInfo");
  return blocks.map((b) => ({
    name: textOf(b, "InventoryName") || "",
    qty: num(textOf(b, "StockRemain")),
  }));
}

function parseProduct(
  xmlText: string,
): { name?: string; groupName?: string; unitPrice?: number; unitBuyPrice?: number } | null {
  const block = extractTag(xmlText, "ProductInfo") || xmlText;
  if (!block.includes("Code") && !block.includes("Name")) return null;
  return {
    name: textOf(block, "Name"),
    groupName: textOf(block, "GroupName"),
    unitPrice: num(textOf(block, "UnitPrice")),
    unitBuyPrice: num(textOf(block, "UnitBuyPrice")),
  };
}

function resolveApiBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (/\/Services\/API$/i.test(trimmed)) return trimmed;
  if (/\/Services$/i.test(trimmed)) return `${trimmed}/API`;
  return `${trimmed}/Services/API`;
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractTag(xmlText: string, tag: string): string | null {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`,
    "i",
  );
  const m = xmlText.match(re);
  return m ? m[1] : null;
}

function splitByTag(xmlText: string, tag: string): string[] {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlText))) out.push(m[1]);
  return out;
}

function textOf(xmlText: string, tag: string): string | undefined {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${tag}[^>]*>([^<]*)<\\/(?:[\\w-]+:)?${tag}>`,
    "i",
  );
  const m = xmlText.match(re);
  const v = m?.[1]?.trim();
  if (!v || v === "null") return undefined;
  return v;
}

function num(value?: string): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function monthIndex(dateStr?: string): number {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return -1;
  const name = d.toLocaleDateString("fa-IR", { month: "long" });
  return MONTH_LABELS.findIndex((m) => name.includes(m));
}

function empty(status: AdapterResult["status"]): AdapterResult {
  return {
    source: "crm",
    status,
    monthly: [],
    salesByCategory: [],
    purchasesByCategory: [],
    inventory: [],
  };
}

/** سازگاری با endpointهای REST سفارشی قدیمی */
async function fetchGenericRest(config: SourceConfig): Promise<AdapterResult> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

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
        `CRM REST HTTP ${salesRes.status}/${purchasesRes.status}/${invRes.status}`,
      );
    }
    const sales = await salesRes.json();
    const purchases = await purchasesRes.json();
    const inventory = await invRes.json();
    return {
      source: "crm",
      status: "connected",
      monthly: MONTH_LABELS.map((month, i) => ({
        month,
        sales: Number(sales.monthly?.[i]?.amount ?? sales.months?.[i] ?? 0),
        purchases: Number(
          purchases.monthly?.[i]?.amount ?? purchases.months?.[i] ?? 0,
        ),
      })),
      salesByCategory: (sales.byCategory ?? []).map(
        (c: { category?: string; name?: string; amount: number; qty?: number }) => ({
          category: c.category ?? c.name ?? "نامشخص",
          amount: Number(c.amount),
          quantity: Number(c.qty ?? 0),
        }),
      ),
      purchasesByCategory: (purchases.byCategory ?? []).map(
        (c: { category?: string; name?: string; amount: number; qty?: number }) => ({
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
      error: err instanceof Error ? err.message : "خطای CRM REST",
    };
  }
}
