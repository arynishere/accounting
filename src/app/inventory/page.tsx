import { InventoryView } from "@/components/InventoryView";
import { getDashboardData } from "@/lib/get-dashboard";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  let initialData = null;
  try {
    initialData = await getDashboardData(false);
  } catch {
    initialData = null;
  }
  return <InventoryView initialData={initialData} />;
}
