import type { DashboardData } from "./types";

const TTL_MS = 30_000;

let cached: { at: number; data: DashboardData } | null = null;

export function getCachedDashboard(): DashboardData | null {
  if (!cached) return null;
  if (Date.now() - cached.at > TTL_MS) {
    cached = null;
    return null;
  }
  return cached.data;
}

export function setCachedDashboard(data: DashboardData): void {
  cached = { at: Date.now(), data };
}

export function clearDashboardCache(): void {
  cached = null;
}
