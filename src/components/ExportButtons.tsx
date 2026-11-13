"use client";

import { FileSpreadsheet, FileCode2 } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import {
  downloadDashboardExcel,
  downloadDashboardXml,
} from "@/lib/export";
import { HelpTip } from "./HelpTip";

export function ExportButtons({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-2"
        onClick={() => downloadDashboardExcel(data)}
      >
        <FileSpreadsheet size={18} />
        خروجی Excel
      </button>
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-2"
        onClick={() => downloadDashboardXml(data)}
      >
        <FileCode2 size={18} />
        خروجی XML
      </button>
      <HelpTip text="Excel چندبرگه‌ای (KPI، روند ماهانه، تفکیک‌ها، موجودی) و XML با جزئیات کامل نمودارها را دانلود می‌کند — مناسب Power BI و اکسل." />
    </div>
  );
}
