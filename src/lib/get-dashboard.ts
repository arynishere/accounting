import { loadConfig } from "@/lib/config";
import { buildDashboard } from "@/lib/adapters";
import {
  cacheKey,
  getCachedDashboard,
  setCachedDashboard,
} from "@/lib/dashboard-cache";
import type { DateRange } from "@/lib/date-range";
import { isValidRange } from "@/lib/date-range";
import type { DashboardData } from "@/lib/types";

/** خواندن داشبورد با کش حافظه — برای SSR و API */
export async function getDashboardData(
  force = false,
  range?: DateRange | null,
): Promise<DashboardData> {
  const key = cacheKey(range?.from, range?.to);
  if (!force) {
    const hit = getCachedDashboard(key);
    if (hit) return hit;
  }
  const config = await loadConfig();
  const data = await buildDashboard(
    config,
    isValidRange(range) ? range : null,
  );
  setCachedDashboard(data, key);
  return data;
}
