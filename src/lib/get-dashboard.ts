import { loadConfig } from "@/lib/config";
import { buildDashboard } from "@/lib/adapters";
import {
  getCachedDashboard,
  setCachedDashboard,
} from "@/lib/dashboard-cache";
import type { DashboardData } from "@/lib/types";

/** خواندن داشبورد با کش حافظه — برای SSR و API */
export async function getDashboardData(
  force = false,
): Promise<DashboardData> {
  if (!force) {
    const hit = getCachedDashboard();
    if (hit) return hit;
  }
  const config = await loadConfig();
  const data = await buildDashboard(config);
  setCachedDashboard(data);
  return data;
}
