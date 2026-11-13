import { ReportList } from "@/components/ReportList";
import { reportsByGroup } from "@/lib/reports-catalog";

export default function SalesReportsPage() {
  return (
    <ReportList
      group="sales"
      title="گزارش‌های فروش"
      subtitle="۱۱ گزارش اولویت‌دار مدیر فروش پرشین پارس — مطابق درخواست کارفرما"
      reports={reportsByGroup("sales")}
    />
  );
}
