export type DataSource = "crm" | "helo" | "sepidar";

export type ConnectionStatus = "connected" | "disconnected" | "error" | "mock";

export interface SourceConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  username?: string;
  password?: string;
  companyId?: string;
  /** هلو: نام بانک اطلاعاتی (dbname) */
  dbName?: string;
  /** CRM: payamgostar (SOAP پیش‌فرض) یا rest */
  crmDialect?: "payamgostar" | "rest";
  /** CRM پیام‌گستر: typeKey اختیاری برای SearchInvoice */
  crmTypeKey?: string;
  /** CRM پیام‌گستر: query اختیاری جستجو */
  crmQuery?: string;
  useMock: boolean;
  /** سپیدار: سریال ۸ حرفی دستگاه */
  deviceSerial?: string;
  /** سپیدار: IntegrationID (چهار رقم اول سریال) */
  integrationId?: string;
  /** سپیدار: کلید عمومی RSA به‌صورت XML پس از Register */
  rsaPublicKeyXml?: string;
  /** سپیدار: GenerationVersion API (پیش‌فرض 101) */
  generationVersion?: string;
  /** سپیدار: روش اتصال — mysql (پیشنهادی) یا api وب‌سرویس فروشگاهی */
  sepidarDialect?: "mysql" | "api";
  /** سپیدار MySQL: هاست */
  mysqlHost?: string;
  /** سپیدار MySQL: پورت (پیش‌فرض 3306) */
  mysqlPort?: string;
}

export interface AppConfig {
  crm: SourceConfig;
  helo: SourceConfig;
  sepidar: SourceConfig;
  /** هدف فروش دوره (ریال) — برای گزارش تحقق هدف */
  salesTarget?: number;
}

export interface MonthlyPoint {
  month: string;
  sales: number;
  purchases: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  quantity: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  value: number;
  warehouse: string;
  source: DataSource;
}

export interface SourceMetrics {
  source: DataSource;
  status: ConnectionStatus;
  label: string;
  totalSales: number;
  totalPurchases: number;
  inventoryValue: number;
  inventoryCount: number;
  lastSync: string | null;
  error?: string;
}

export interface DashboardData {
  sources: SourceMetrics[];
  monthly: MonthlyPoint[];
  salesByCategory: CategoryBreakdown[];
  purchasesByCategory: CategoryBreakdown[];
  inventoryByCategory: CategoryBreakdown[];
  inventory: InventoryItem[];
  totals: {
    sales: number;
    purchases: number;
    inventoryValue: number;
    inventoryUnits: number;
    profit: number;
  };
  generatedAt: string;
  /** بازه انتخاب‌شده برای نمودار و خروجی (YYYY-MM-DD) */
  dateFrom?: string;
  dateTo?: string;
}

export interface AdapterResult {
  source: DataSource;
  status: ConnectionStatus;
  monthly: MonthlyPoint[];
  salesByCategory: CategoryBreakdown[];
  purchasesByCategory: CategoryBreakdown[];
  inventory: InventoryItem[];
  error?: string;
}
