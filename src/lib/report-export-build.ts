import type { ReportPayload } from "./report-types";

function xmlEscape(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildReportXml(data: ReportPayload): string {
  const kpis = data.kpis
    .map(
      (k) =>
        `    <Kpi label="${xmlEscape(k.label)}" value="${k.value}" format="${xmlEscape(k.format || "number")}" />`,
    )
    .join("\n");
  const series = data.series
    .map(
      (s) =>
        `    <Point label="${xmlEscape(s.label)}" value="${s.value}" value2="${s.value2 ?? ""}" value3="${s.value3 ?? ""}" />`,
    )
    .join("\n");
  const rows = data.rows
    .map((row) => {
      const attrs = Object.entries(row)
        .map(([k, v]) => `${k}="${xmlEscape(v)}"`)
        .join(" ");
      return `    <Row ${attrs} />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<MaliNamayReport id="${xmlEscape(data.id)}" title="${xmlEscape(data.title)}" dataMode="${xmlEscape(data.dataMode)}" generatedAt="${xmlEscape(data.generatedAt)}" dateFrom="${xmlEscape(data.dateFrom ?? "")}" dateTo="${xmlEscape(data.dateTo ?? "")}">
  <Summary>${xmlEscape(data.summary)}</Summary>
  <Kpis>
${kpis}
  </Kpis>
  <Series>
${series}
  </Series>
  <Rows>
${rows}
  </Rows>
</MaliNamayReport>
`;
}

export function buildReportExcelXml(data: ReportPayload): string {
  const kpiRows = data.kpis
    .map(
      (k) =>
        `   <Row><Cell><Data ss:Type="String">${xmlEscape(k.label)}</Data></Cell><Cell><Data ss:Type="Number">${k.value}</Data></Cell></Row>`,
    )
    .join("\n");
  const seriesRows = data.series
    .map(
      (s) =>
        `   <Row><Cell><Data ss:Type="String">${xmlEscape(s.label)}</Data></Cell><Cell><Data ss:Type="Number">${s.value}</Data></Cell><Cell><Data ss:Type="Number">${s.value2 ?? 0}</Data></Cell></Row>`,
    )
    .join("\n");
  const header = data.columns
    .map(
      (c) =>
        `<Cell><Data ss:Type="String">${xmlEscape(c.label)}</Data></Cell>`,
    )
    .join("");
  const body = data.rows
    .map((row) => {
      const cells = data.columns
        .map((c) => {
          const v = row[c.key];
          if (typeof v === "number") {
            return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`;
        })
        .join("");
      return `   <Row>${cells}</Row>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="KPI">
  <Table>
   <Row><Cell><Data ss:Type="String">شاخص</Data></Cell><Cell><Data ss:Type="String">مقدار</Data></Cell></Row>
${kpiRows}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="نمودار">
  <Table>
   <Row><Cell><Data ss:Type="String">برچسب</Data></Cell><Cell><Data ss:Type="String">مقدار</Data></Cell><Cell><Data ss:Type="String">مقدار۲</Data></Cell></Row>
${seriesRows}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="جدول">
  <Table>
   <Row>${header}</Row>
${body}
  </Table>
 </Worksheet>
</Workbook>
`;
}
