import type { AdapterResult, CategoryBreakdown, MonthlyPoint, SourceConfig } from "../types";
import { getMockAdapterResult } from "../mock-data";
import { MONTH_LABELS } from "../format";
import type { DateRange } from "../date-range";
import { dateInRange } from "../date-range";
import {
  encryptArbitraryCode,
  encryptIntegrationId,
  integrationIdFromSerial,
  md5Hex,
  newArbitraryCode,
  decryptPublicKeyXml,
} from "./sepidar-crypto";
import { fetchSepidarMysql } from "./sepidar-mysql";

/**
 * آداپتر سپیدار
 * - mysql (پیشنهادی): خواندن مستقیم از دیتابیس MySQL
 * - api: وب‌سرویس فروشگاهی (پورت 7373، Register/Login)
 */

type SepidarInvoice = {
  InvoiceID: number;
  Date: string;
  Price?: number;
  NetPrice?: number | null;
  Discount?: number | null;
};

type SepidarItem = {
  ItemID: number;
  Code?: string;
  Title?: string;
  SaleGroupRef?: number | null;
  TotalInventory?: number;
  IsActive?: boolean;
};

type SepidarInventory = {
  ItemRef: number;
  StockeRef?: number;
  StockRef?: number;
  Quantity: number;
};

type SepidarStock = {
  StockID: number;
  Title?: string;
  Name?: string;
};

type SepidarPrice = {
  ItemRef: number;
  Fee: number;
};

export async function registerSepidarDevice(config: SourceConfig): Promise<{
  deviceTitle: string;
  rsaPublicKeyXml: string;
  integrationId: number;
}> {
  if (!config.baseUrl || !config.deviceSerial) {
    throw new Error("آدرس پایه و سریال دستگاه سپیدار الزامی است");
  }

  const serial = config.deviceSerial.trim();
  const integrationId =
    Number(config.integrationId) || integrationIdFromSerial(serial);
  const { Cypher, IV } = encryptIntegrationId(serial, integrationId);

  const res = await fetch(`${trimSlash(config.baseUrl)}/api/Devices/Register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Cypher,
      IV,
      IntegrationID: integrationId,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await safeText(res);
    throw new Error(`ثبت دستگاه سپیدار ناموفق: HTTP ${res.status} ${body}`);
  }

  const data = await res.json();
  const rsaPublicKeyXml = decryptPublicKeyXml(serial, data.Cypher, data.IV);
  return {
    deviceTitle: data.DeviceTitle ?? "",
    rsaPublicKeyXml,
    integrationId,
  };
}

export async function fetchSepidar(
  config: SourceConfig,
  range?: DateRange | null,
): Promise<AdapterResult> {
  if (!config.enabled) {
    return empty("disconnected");
  }

  const dialect = config.sepidarDialect || "mysql";
  if (dialect === "mysql") {
    if (config.useMock) return getMockAdapterResult("sepidar", range);
    return fetchSepidarMysql(config, range);
  }

  if (config.useMock || !config.baseUrl) {
    return getMockAdapterResult("sepidar", range);
  }

  try {
    const ctx = await authenticate(config);
    const base = trimSlash(config.baseUrl);

    const [items, inventories, stocks, prices, invoices] = await Promise.all([
      sepidarGet<SepidarItem[]>(base, "/api/Items", ctx),
      sepidarGet<SepidarInventory[]>(base, "/api/Items/Inventories/", ctx),
      sepidarGet<SepidarStock[]>(base, "/api/Stocks", ctx).catch(() => []),
      sepidarGet<SepidarPrice[]>(base, "/api/PriceNoteItems", ctx).catch(
        () => [],
      ),
      sepidarGet<SepidarInvoice[]>(base, "/api/invoices/", ctx),
    ]);

    const stockMap = new Map(
      (stocks ?? []).map((s) => [
        s.StockID,
        s.Title ?? s.Name ?? `انبار ${s.StockID}`,
      ]),
    );
    const itemMap = new Map((items ?? []).map((i) => [i.ItemID, i]));
    const priceMap = new Map<number, number>();
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ItemRef)) priceMap.set(p.ItemRef, Number(p.Fee) || 0);
    }

    const qtyByItem = new Map<number, { qty: number; stockId: number }>();
    for (const row of inventories ?? []) {
      const prev = qtyByItem.get(row.ItemRef) ?? { qty: 0, stockId: 0 };
      const stockId = Number(row.StockeRef ?? row.StockRef ?? 0);
      prev.qty += Number(row.Quantity) || 0;
      if (!prev.stockId && stockId) prev.stockId = stockId;
      qtyByItem.set(row.ItemRef, prev);
    }

    // اگر Inventories خالی بود از TotalInventory روی Item استفاده کن
    if (qtyByItem.size === 0) {
      for (const item of items ?? []) {
        if (item.TotalInventory) {
          qtyByItem.set(item.ItemID, {
            qty: Number(item.TotalInventory) || 0,
            stockId: 0,
          });
        }
      }
    }

    const inventory = [...qtyByItem.entries()].map(([itemId, info]) => {
      const item = itemMap.get(itemId);
      const fee = priceMap.get(itemId) ?? 0;
      return {
        sku: item?.Code ?? String(itemId),
        name: item?.Title ?? `کالا ${itemId}`,
        category: item?.SaleGroupRef
          ? `گروه فروش ${item.SaleGroupRef}`
          : "سایر",
        quantity: info.qty,
        value: Math.round(info.qty * fee),
        warehouse: info.stockId
          ? (stockMap.get(info.stockId) ?? `انبار ${info.stockId}`)
          : "—",
        source: "sepidar" as const,
      };
    });

    const filteredInvoices = (invoices ?? []).filter((inv) =>
      dateInRange(inv.Date, range),
    );
    const monthly = aggregateMonthlySales(filteredInvoices);
    const salesByCategory = salesFromInvoices(filteredInvoices);

    return {
      source: "sepidar",
      status: "connected",
      monthly,
      salesByCategory,
      // وب‌سرویس فروشگاهی سپیدار endpoint فاکتور خرید ندارد
      purchasesByCategory: [],
      inventory,
    };
  } catch (err) {
    return {
      ...getMockAdapterResult("sepidar"),
      status: "error",
      error: err instanceof Error ? err.message : "خطای ناشناخته سپیدار",
    };
  }
}

async function authenticate(config: SourceConfig): Promise<{
  token: string;
  integrationId: number;
  generationVersion: string;
  rsaPublicKeyXml: string;
}> {
  let rsaPublicKeyXml = config.rsaPublicKeyXml?.trim() ?? "";
  const serial = config.deviceSerial?.trim() ?? "";
  const generationVersion = config.generationVersion?.trim() || "101";
  const integrationId =
    Number(config.integrationId) ||
    (serial ? integrationIdFromSerial(serial) : 0);

  if (!integrationId) {
    throw new Error("IntegrationID یا سریال دستگاه سپیدار تنظیم نشده است");
  }

  // اگر کلید RSA نداریم ولی سریال داریم، Register خودکار
  if (!rsaPublicKeyXml && serial) {
    const reg = await registerSepidarDevice({
      ...config,
      deviceSerial: serial,
      integrationId: String(integrationId),
    });
    rsaPublicKeyXml = reg.rsaPublicKeyXml;
  }

  if (!rsaPublicKeyXml) {
    throw new Error(
      "کلید عمومی RSA سپیدار موجود نیست؛ ابتدا دستگاه را Register کنید",
    );
  }

  // توکن ذخیره‌شده در apiKey در صورت وجود استفاده می‌شود؛ وگرنه Login
  if (config.apiKey && !config.apiKey.includes("•") && config.username === "") {
    // unlikely path
  }

  if (!config.username || !config.password) {
    if (config.apiKey && !config.apiKey.includes("•")) {
      return {
        token: config.apiKey,
        integrationId,
        generationVersion,
        rsaPublicKeyXml,
      };
    }
    throw new Error("نام کاربری و رمز عبور سپیدار الزامی است");
  }

  const arbitraryCode = newArbitraryCode();
  const encArbitraryCode = encryptArbitraryCode(rsaPublicKeyXml, arbitraryCode);

  const loginRes = await fetch(
    `${trimSlash(config.baseUrl)}/api/users/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        GenerationVersion: generationVersion,
        IntegrationID: String(integrationId),
        ArbitraryCode: arbitraryCode,
        EncArbitraryCode: encArbitraryCode,
      },
      body: JSON.stringify({
        UserName: config.username,
        PasswordHash: md5Hex(config.password),
      }),
      cache: "no-store",
    },
  );

  if (!loginRes.ok) {
    throw new Error(
      `لاگین سپیدار ناموفق: HTTP ${loginRes.status} ${await safeText(loginRes)}`,
    );
  }

  const login = await loginRes.json();
  const token = login.Token ?? login.token;
  if (!token) throw new Error("توکن JWT از سپیدار دریافت نشد");

  return { token, integrationId, generationVersion, rsaPublicKeyXml };
}

async function sepidarGet<T>(
  base: string,
  path: string,
  ctx: {
    token: string;
    integrationId: number;
    generationVersion: string;
    rsaPublicKeyXml: string;
  },
): Promise<T> {
  const arbitraryCode = newArbitraryCode();
  const encArbitraryCode = encryptArbitraryCode(
    ctx.rsaPublicKeyXml,
    arbitraryCode,
  );

  const res = await fetch(`${base}${path}`, {
    headers: {
      Accept: "application/json",
      GenerationVersion: ctx.generationVersion,
      Authorization: ctx.token.startsWith("Bearer ")
        ? ctx.token
        : `Bearer ${ctx.token}`,
      IntegrationID: String(ctx.integrationId),
      ArbitraryCode: arbitraryCode,
      EncArbitraryCode: encArbitraryCode,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`سپیدار ${path}: HTTP ${res.status} ${await safeText(res)}`);
  }

  return (await res.json()) as T;
}

function aggregateMonthlySales(invoices: SepidarInvoice[]): MonthlyPoint[] {
  const sales = new Array(12).fill(0);
  for (const inv of invoices) {
    const amount = Number(inv.NetPrice ?? inv.Price ?? 0);
    const idx = persianMonthIndex(inv.Date);
    if (idx >= 0) sales[idx] += amount;
  }
  return MONTH_LABELS.map((month, i) => ({
    month,
    sales: Math.round(sales[i]),
    purchases: 0,
  }));
}

function salesFromInvoices(invoices: SepidarInvoice[]): CategoryBreakdown[] {
  // لیست فاکتورها اقلام ندارد؛ تفکیک بر اساس ماه شمسی
  const map = new Map<string, CategoryBreakdown>();
  for (const inv of invoices) {
    const idx = persianMonthIndex(inv.Date);
    const category = idx >= 0 ? MONTH_LABELS[idx] : "سایر";
    const prev = map.get(category) ?? {
      category,
      amount: 0,
      quantity: 0,
    };
    prev.amount += Number(inv.NetPrice ?? inv.Price ?? 0);
    prev.quantity += 1;
    map.set(category, prev);
  }
  return [...map.values()]
    .map((r) => ({ ...r, amount: Math.round(r.amount) }))
    .sort((a, b) => b.amount - a.amount);
}

function persianMonthIndex(dateStr: string): number {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return -1;
    const name = d.toLocaleDateString("fa-IR", { month: "long" });
    return MONTH_LABELS.findIndex((m) => name.includes(m) || m.includes(name));
  } catch {
    return -1;
  }
}

function empty(status: AdapterResult["status"]): AdapterResult {
  return {
    source: "sepidar",
    status,
    monthly: [],
    salesByCategory: [],
    purchasesByCategory: [],
    inventory: [],
  };
}

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

async function safeText(res: Response) {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}
