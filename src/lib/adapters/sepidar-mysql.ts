import type { RowDataPacket } from "mysql2/promise";
import type {
  AdapterResult,
  CategoryBreakdown,
  InventoryItem,
  MonthlyPoint,
  SourceConfig,
} from "../types";
import type { DateRange } from "../date-range";
import { isValidRange } from "../date-range";
import { MONTH_LABELS } from "../format";
import { listColumns, listTables, mysqlPing, mysqlQuery } from "../mysql";
import { getMockAdapterResult } from "../mock-data";

/**
 * آداپتر سپیدار از طریق MySQL
 *
 * اولویت خواندن:
 * 1) ویوهای استاندارد مالی‌نما (اگر ساخته شده باشند)
 * 2) کشف خودکار جداول شبیه Invoice / Item / Stock
 *
 * ویوهای پیشنهادی (در دیتابیس سپیدار بسازید):
 *   mali_sales_invoices(invoice_date, amount, discount, category, quantity)
 *   mali_purchase_invoices(invoice_date, amount, discount, category, quantity)
 *   mali_inventory(sku, name, category, quantity, value, warehouse)
 */

type Conn = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function connFrom(config: SourceConfig): Conn {
  const host = (config.mysqlHost || config.baseUrl || "").replace(
    /^mysql:\/\//,
    "",
  );
  if (!host || !config.username || !config.dbName) {
    throw new Error(
      "برای سپیدار MySQL فیلدهای host، username و نام دیتابیس الزامی است",
    );
  }
  return {
    host: host.split(":")[0],
    port: Number(config.mysqlPort || host.split(":")[1] || 3306),
    user: config.username,
    password: config.password || "",
    database: config.dbName,
  };
}

export async function probeSepidarMysql(config: SourceConfig) {
  const c = connFrom(config);
  const ping = await mysqlPing(c);
  if (!ping.ok) return { ...ping, tables: [] as string[] };
  const tables = await listTables(c);
  return { ...ping, tables };
}

export async function fetchSepidarMysql(
  config: SourceConfig,
  range?: DateRange | null,
): Promise<AdapterResult> {
  if (!config.enabled) {
    return empty("disconnected");
  }
  if (config.useMock) {
    return getMockAdapterResult("sepidar", range);
  }

  try {
    const c = connFrom(config);
    const ping = await mysqlPing(c);
    if (!ping.ok) throw new Error(ping.error || "اتصال MySQL ناموفق");

    const tables = await listTables(c);
    const lower = new Map(tables.map((t) => [t.toLowerCase(), t]));

    const salesView = lower.get("mali_sales_invoices");
    const buyView = lower.get("mali_purchase_invoices");
    const invView = lower.get("mali_inventory");

    let salesRows: RowDataPacket[] = [];
    let buyRows: RowDataPacket[] = [];
    let invRows: RowDataPacket[] = [];

    if (salesView) {
      salesRows = await queryInvoiceView(c, salesView, range);
    } else {
      const detected = await detectAndQueryInvoices(c, tables, range, "sale");
      salesRows = detected;
    }

    if (buyView) {
      buyRows = await queryInvoiceView(c, buyView, range);
    } else {
      buyRows = await detectAndQueryInvoices(c, tables, range, "purchase");
    }

    if (invView) {
      invRows = await mysqlQuery<RowDataPacket[]>(
        c,
        `SELECT sku, name, category, quantity, value, warehouse FROM \`${invView}\``,
      );
    } else {
      invRows = await detectAndQueryInventory(c, tables);
    }

    const monthly = mergeMonthlyFromRows(salesRows, buyRows);
    return {
      source: "sepidar",
      status: "connected",
      monthly,
      salesByCategory: categoriesFromRows(salesRows),
      purchasesByCategory: categoriesFromRows(buyRows),
      inventory: inventoryFromRows(invRows),
    };
  } catch (err) {
    return {
      ...getMockAdapterResult("sepidar", range),
      status: "error",
      error: err instanceof Error ? err.message : "خطای سپیدار MySQL",
    };
  }
}

async function queryInvoiceView(
  c: Conn,
  view: string,
  range?: DateRange | null,
): Promise<RowDataPacket[]> {
  if (isValidRange(range)) {
    return mysqlQuery<RowDataPacket[]>(
      c,
      `SELECT invoice_date, amount, discount, category, quantity
       FROM \`${view}\`
       WHERE invoice_date BETWEEN ? AND ?`,
      [range.from, range.to],
    );
  }
  return mysqlQuery<RowDataPacket[]>(
    c,
    `SELECT invoice_date, amount, discount, category, quantity FROM \`${view}\``,
  );
}

async function detectAndQueryInvoices(
  c: Conn,
  tables: string[],
  range: DateRange | null | undefined,
  kind: "sale" | "purchase",
): Promise<RowDataPacket[]> {
  const candidates = tables.filter((t) => {
    const n = t.toLowerCase();
    if (kind === "sale") {
      return (
        n.includes("invoice") ||
        n.includes("sale") ||
        n.includes("factor") ||
        n.includes("فروش")
      );
    }
    return (
      n.includes("purchase") ||
      n.includes("buy") ||
      n.includes("خرید") ||
      (n.includes("invoice") && n.includes("purchase"))
    );
  });

  for (const table of candidates) {
    const cols = await listColumns(c, table);
    const map = mapInvoiceColumns(cols.map((x) => x.name));
    if (!map.date || !map.amount) continue;

    const where =
      isValidRange(range) && map.date
        ? `WHERE \`${map.date}\` BETWEEN ? AND ?`
        : "";
    const params = isValidRange(range) ? [range.from, range.to] : [];
    const sql = `
      SELECT
        \`${map.date}\` AS invoice_date,
        \`${map.amount}\` AS amount,
        ${map.discount ? `\`${map.discount}\` AS discount` : "0 AS discount"},
        ${map.category ? `\`${map.category}\` AS category` : "'سایر' AS category"},
        ${map.quantity ? `\`${map.quantity}\` AS quantity` : "1 AS quantity"}
      FROM \`${table}\`
      ${where}
      LIMIT 50000`;
    try {
      return await mysqlQuery<RowDataPacket[]>(c, sql, params);
    } catch {
      continue;
    }
  }
  return [];
}

async function detectAndQueryInventory(
  c: Conn,
  tables: string[],
): Promise<RowDataPacket[]> {
  const candidates = tables.filter((t) => {
    const n = t.toLowerCase();
    return (
      n.includes("item") ||
      n.includes("product") ||
      n.includes("inventory") ||
      n.includes("stock") ||
      n.includes("کالا") ||
      n.includes("موجودی")
    );
  });

  for (const table of candidates) {
    const cols = await listColumns(c, table);
    const map = mapInventoryColumns(cols.map((x) => x.name));
    if (!map.name && !map.sku) continue;
    const sql = `
      SELECT
        ${map.sku ? `\`${map.sku}\` AS sku` : "'' AS sku"},
        ${map.name ? `\`${map.name}\` AS name` : "'—' AS name"},
        ${map.category ? `\`${map.category}\` AS category` : "'سایر' AS category"},
        ${map.quantity ? `\`${map.quantity}\` AS quantity` : "0 AS quantity"},
        ${map.value ? `\`${map.value}\` AS value` : "0 AS value"},
        ${map.warehouse ? `\`${map.warehouse}\` AS warehouse` : "'انبار' AS warehouse"}
      FROM \`${table}\`
      LIMIT 20000`;
    try {
      return await mysqlQuery<RowDataPacket[]>(c, sql);
    } catch {
      continue;
    }
  }
  return [];
}

function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_\u0600-\u06ff]/g, "");
}

function pick(cols: string[], patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const hit = cols.find((c) => p.test(norm(c)));
    if (hit) return hit;
  }
  return null;
}

function mapInvoiceColumns(cols: string[]) {
  return {
    date: pick(cols, [
      /^invoice_?date$/,
      /^date$/,
      /تاریخ/,
      /docdate/,
      /issuedate/,
    ]),
    amount: pick(cols, [
      /^net_?price$/,
      /^netamount$/,
      /^amount$/,
      /^price$/,
      /^total$/,
      /مبلغ/,
      /خالص/,
    ]),
    discount: pick(cols, [/^discount$/, /تخفیف/]),
    category: pick(cols, [
      /^category$/,
      /^group/,
      /گروه/,
      /categoryname/,
      /itemgroup/,
    ]),
    quantity: pick(cols, [/^quantity$/, /^qty$/, /تعداد/, /count/]),
  };
}

function mapInventoryColumns(cols: string[]) {
  return {
    sku: pick(cols, [/^sku$/, /^code$/, /^itemcode$/, /کد/]),
    name: pick(cols, [/^name$/, /^title$/, /^itemname$/, /نام/, /عنوان/]),
    category: pick(cols, [/^category$/, /^group/, /گروه/]),
    quantity: pick(cols, [
      /^quantity$/,
      /^qty$/,
      /^stock$/,
      /^inventory$/,
      /موجودی/,
      /تعداد/,
    ]),
    value: pick(cols, [/^value$/, /^amount$/, /^price$/, /ارزش/, /قیمت/]),
    warehouse: pick(cols, [/^warehouse$/, /^stockname$/, /انبار/]),
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function monthIndex(dateStr: unknown): number {
  try {
    const d = new Date(String(dateStr));
    if (Number.isNaN(d.getTime())) return -1;
    const name = d.toLocaleDateString("fa-IR", { month: "long" });
    return MONTH_LABELS.findIndex((m) => name.includes(m) || m.includes(name));
  } catch {
    return -1;
  }
}

function mergeMonthlyFromRows(
  sales: RowDataPacket[],
  purchases: RowDataPacket[],
): MonthlyPoint[] {
  const s = new Array(12).fill(0);
  const p = new Array(12).fill(0);
  for (const row of sales) {
    const i = monthIndex(row.invoice_date);
    if (i >= 0) s[i] += num(row.amount);
  }
  for (const row of purchases) {
    const i = monthIndex(row.invoice_date);
    if (i >= 0) p[i] += num(row.amount);
  }
  return MONTH_LABELS.map((month, i) => ({
    month,
    sales: Math.round(s[i]),
    purchases: Math.round(p[i]),
  }));
}

function categoriesFromRows(rows: RowDataPacket[]): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  for (const row of rows) {
    const category = String(row.category || "سایر");
    const prev = map.get(category) ?? {
      category,
      amount: 0,
      quantity: 0,
    };
    prev.amount += num(row.amount);
    prev.quantity += num(row.quantity) || 1;
    map.set(category, prev);
  }
  return [...map.values()]
    .map((r) => ({ ...r, amount: Math.round(r.amount) }))
    .sort((a, b) => b.amount - a.amount);
}

function inventoryFromRows(rows: RowDataPacket[]): InventoryItem[] {
  return rows
    .map((row) => {
      const quantity = num(row.quantity);
      const value = num(row.value) || 0;
      return {
        sku: String(row.sku || "-"),
        name: String(row.name || "—"),
        category: String(row.category || "سایر"),
        quantity,
        value: Math.round(value || quantity),
        warehouse: String(row.warehouse || "انبار سپیدار"),
        source: "sepidar" as const,
      };
    })
    .sort((a, b) => b.value - a.value);
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
