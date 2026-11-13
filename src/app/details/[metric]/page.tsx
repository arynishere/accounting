import { notFound } from "next/navigation";
import { MetricDetailView } from "@/components/MetricDetailView";
import { getDashboardData } from "@/lib/get-dashboard";
import { isValidRange } from "@/lib/date-range";
import { isMetricKey } from "@/lib/metric-detail";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function MetricDetailPage({ params, searchParams }: Props) {
  const { metric } = await params;
  const sp = await searchParams;

  if (!isMetricKey(metric)) notFound();

  const from = sp.from || "";
  const to = sp.to || "";
  const range =
    from && to && isValidRange({ from, to }) ? { from, to } : null;

  let initialData = null;
  try {
    initialData = await getDashboardData(false, range);
  } catch {
    initialData = null;
  }

  return (
    <MetricDetailView
      metric={metric}
      initialData={initialData}
      initialFrom={from}
      initialTo={to}
    />
  );
}
