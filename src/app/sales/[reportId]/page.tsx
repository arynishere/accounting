import { notFound } from "next/navigation";
import { ReportShell } from "@/components/ReportShell";
import { getReport } from "@/lib/reports-catalog";
import { getReportPayload } from "@/lib/get-report";
import { isValidRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function SalesReportPage({ params, searchParams }: Props) {
  const { reportId } = await params;
  const sp = await searchParams;
  const def = getReport(reportId);
  if (!def || def.group !== "sales") notFound();

  const from = sp.from || "";
  const to = sp.to || "";
  const range =
    from && to && isValidRange({ from, to }) ? { from, to } : null;

  let initialData = null;
  try {
    initialData = await getReportPayload(reportId, range);
  } catch {
    initialData = null;
  }

  return (
    <ReportShell
      reportId={reportId}
      groupPath="sales"
      initialData={initialData}
      initialFrom={from}
      initialTo={to}
    />
  );
}
