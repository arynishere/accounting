import type { DataMode } from "./reports-catalog";

export type ReportKpi = {
  label: string;
  value: number;
  format?: "money" | "percent" | "number" | "days";
  hint?: string;
  tone?: "sales" | "buy" | "profit" | "stock" | "warn";
};

export type ReportSeriesPoint = {
  label: string;
  value: number;
  value2?: number;
  value3?: number;
};

export type ReportTableColumn = {
  key: string;
  label: string;
  format?: "money" | "percent" | "number" | "text" | "date";
};

export type ReportPayload = {
  id: string;
  title: string;
  summary: string;
  dataMode: DataMode;
  generatedAt: string;
  dateFrom?: string;
  dateTo?: string;
  kpis: ReportKpi[];
  series: ReportSeriesPoint[];
  seriesLabel?: string;
  seriesLabel2?: string;
  seriesLabel3?: string;
  breakdown: ReportSeriesPoint[];
  breakdownTitle?: string;
  columns: ReportTableColumn[];
  rows: Record<string, string | number>[];
  alerts?: string[];
};
