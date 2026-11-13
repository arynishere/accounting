import { ReportList } from "@/components/ReportList";
import { reportsByGroup } from "@/lib/reports-catalog";

export default function FinanceReportsPage() {
  return (
    <ReportList
      group="finance"
      title="داشبورد مدیریتی مالی"
      subtitle="۱۴ بخش گزارش واحد مالی — مطابق نامه کارفرما"
      reports={reportsByGroup("finance")}
    />
  );
}
