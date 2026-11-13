import type { DashboardData } from "./types";

/** کش کوتاه تا حالت لحظه‌ای داده تازه بگیرد */
const TTL_MS = 10_000;

let cached: { at: number; key: string; data: DashboardData } | null = null;

export function cacheKey(from?: string, to?: string): string {
  return `${from || ""}|${to || ""}`;
}

export function getCachedDashboard(key = "|"): DashboardData | null {
  if (!cached || cached.key !== key) return null;
  if (Date.now() - cached.at > TTL_MS) {
    cached = null;
    return null;
  }
  return cached.data;
}

export function setCachedDashboard(data: DashboardData, key = "|"): void {
  cached = { at: Date.now(), key, data };
}

export function clearDashboardCache(): void {
  cached = null;
}
