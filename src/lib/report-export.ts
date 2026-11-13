import type { ReportPayload } from "./report-types";
import { buildReportExcelXml, buildReportXml } from "./report-export-build";

export { buildReportExcelXml, buildReportXml };

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadReportXml(data: ReportPayload) {
  downloadBlob(
    new Blob([buildReportXml(data)], { type: "application/xml;charset=utf-8" }),
    `report-${data.id}-${stamp()}.xml`,
  );
}

export function downloadReportExcel(data: ReportPayload) {
  downloadBlob(
    new Blob(["\uFEFF", buildReportExcelXml(data)], {
      type: "application/vnd.ms-excel;charset=utf-8",
    }),
    `report-${data.id}-${stamp()}.xls`,
  );
}
