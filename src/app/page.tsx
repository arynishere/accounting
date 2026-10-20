import { DashboardView } from "@/components/DashboardView";
import { getDashboardData } from "@/lib/get-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialData = null;
  let initialError: string | null = null;

  try {
    initialData = await getDashboardData(false);
  } catch (err) {
    initialError =
      err instanceof Error ? err.message : "خطا در بارگذاری داشبورد";
  }

  return (
    <DashboardView initialData={initialData} initialError={initialError} />
  );
}
