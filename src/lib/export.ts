import type { DashboardData } from "./types";

function xmlEscape(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

/** خروجی XML با جزئیات کامل داشبورد و نمودارها */
export function buildDashboardXml(data: DashboardData): string {
  const sources = data.sources
    .map(
      (s) => `    <Source key="${xmlEscape(s.source)}" label="${xmlEscape(s.label)}" status="${xmlEscape(s.status)}" sales="${s.totalSales}" purchases="${s.totalPurchases}" inventoryValue="${s.inventoryValue}" inventoryCount="${s.inventoryCount}" lastSync="${xmlEscape(s.lastSync ?? "")}" error="${xmlEscape(s.error ?? "")}" />`,
    )
    .join("\n");

  const monthly = data.monthly
    .map(
      (m) =>
        `    <Point month="${xmlEscape(m.month)}" sales="${m.sales}" purchases="${m.purchases}" profit="${m.sales - m.purchases}" />`,
    )
    .join("\n");

  const cat = (rows: typeof data.salesByCategory, tag: string) =>
    rows
      .map(
        (r) =>
          `    <${tag} category="${xmlEscape(r.category)}" amount="${r.amount}" quantity="${r.quantity}" />`,
      )
      .join("\n");

  const inventory = data.inventory
    .map(
      (i) =>
        `    <Item sku="${xmlEscape(i.sku)}" name="${xmlEscape(i.name)}" category="${xmlEscape(i.category)}" quantity="${i.quantity}" value="${i.value}" warehouse="${xmlEscape(i.warehouse)}" source="${xmlEscape(i.source)}" />`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<MaliNamayExport
  generatedAt="${xmlEscape(data.generatedAt)}"
  exportedAt="${xmlEscape(new Date().toISOString())}"
  dateFrom="${xmlEscape(data.dateFrom ?? "")}"
  dateTo="${xmlEscape(data.dateTo ?? "")}"
  version="1.0">
  <DateRange from="${xmlEscape(data.dateFrom ?? "")}" to="${xmlEscape(data.dateTo ?? "")}" />
  <Totals
    sales="${data.totals.sales}"
    purchases="${data.totals.purchases}"
    profit="${data.totals.profit}"
    inventoryValue="${data.totals.inventoryValue}"
    inventoryUnits="${data.totals.inventoryUnits}" />
  <Sources>
${sources}
  </Sources>
  <Charts>
    <MonthlyTrend description="روند ماهانه فروش و خرید">
${monthly}
    </MonthlyTrend>
    <SalesByCategory>
${cat(data.salesByCategory, "Row")}
    </SalesByCategory>
    <PurchasesByCategory>
${cat(data.purchasesByCategory, "Row")}
    </PurchasesByCategory>
    <InventoryByCategory>
${cat(data.inventoryByCategory, "Row")}
    </InventoryByCategory>
  </Charts>
  <Inventory count="${data.inventory.length}">
${inventory}
  </Inventory>
</MaliNamayExport>
`;
}

function excelCell(value: string | number, type: "String" | "Number" = "String"): string {
  if (type === "Number") {
    const n = Number(value);
    return `<Cell><Data ss:Type="Number">${Number.isFinite(n) ? n : 0}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
}

function excelRow(cells: string[]): string {
  return `   <Row>${cells.join("")}</Row>`;
}

/** Excel SpreadsheetML (.xls) چندبرگه‌ای شبیه خروجی Power BI */
export function buildDashboardExcelXml(data: DashboardData): string {
  const sheets: string[] = [];

  // KPI
  sheets.push(` <Worksheet ss:Name="KPI">
  <Table>
${excelRow([excelCell("شاخص"), excelCell("مقدار")])}
${excelRow([excelCell("جمع فروش"), excelCell(data.totals.sales, "Number")])}
${excelRow([excelCell("جمع خرید"), excelCell(data.totals.purchases, "Number")])}
${excelRow([excelCell("سود ناخالص"), excelCell(data.totals.profit, "Number")])}
${excelRow([excelCell("ارزش موجودی"), excelCell(data.totals.inventoryValue, "Number")])}
${excelRow([excelCell("تعداد واحد موجودی"), excelCell(data.totals.inventoryUnits, "Number")])}
${excelRow([excelCell("زمان تولید داده"), excelCell(data.generatedAt)])}
${excelRow([excelCell("از تاریخ"), excelCell(data.dateFrom ?? "")])}
${excelRow([excelCell("تا تاریخ"), excelCell(data.dateTo ?? "")])}
  </Table>
 </Worksheet>`);

  // Monthly trend
  const monthlyRows = data.monthly
    .map((m) =>
      excelRow([
        excelCell(m.month),
        excelCell(m.sales, "Number"),
        excelCell(m.purchases, "Number"),
        excelCell(m.sales - m.purchases, "Number"),
      ]),
    )
    .join("\n");
  sheets.push(` <Worksheet ss:Name="روند ماهانه">
  <Table>
${excelRow([excelCell("ماه"), excelCell("فروش"), excelCell("خرید"), excelCell("سود")])}
${monthlyRows}
  </Table>
 </Worksheet>`);

  const catSheet = (name: string, rows: typeof data.salesByCategory) => {
    const body = rows
      .map((r) =>
        excelRow([
          excelCell(r.category),
          excelCell(r.amount, "Number"),
          excelCell(r.quantity, "Number"),
        ]),
      )
      .join("\n");
    return ` <Worksheet ss:Name="${xmlEscape(name)}">
  <Table>
${excelRow([excelCell("گروه"), excelCell("مبلغ"), excelCell("تعداد")])}
${body}
  </Table>
 </Worksheet>`;
  };

  sheets.push(catSheet("فروش گروهی", data.salesByCategory));
  sheets.push(catSheet("خرید گروهی", data.purchasesByCategory));
  sheets.push(catSheet("موجودی گروهی", data.inventoryByCategory));

  const invRows = data.inventory
    .map((i) =>
      excelRow([
        excelCell(i.sku),
        excelCell(i.name),
        excelCell(i.category),
        excelCell(i.quantity, "Number"),
        excelCell(i.value, "Number"),
        excelCell(i.warehouse),
        excelCell(i.source),
      ]),
    )
    .join("\n");
  sheets.push(` <Worksheet ss:Name="موجودی جزئی">
  <Table>
${excelRow([
  excelCell("کد"),
  excelCell("نام"),
  excelCell("گروه"),
  excelCell("تعداد"),
  excelCell("ارزش"),
  excelCell("انبار"),
  excelCell("منبع"),
])}
${invRows}
  </Table>
 </Worksheet>`);

  const srcRows = data.sources
    .map((s) =>
      excelRow([
        excelCell(s.label),
        excelCell(s.source),
        excelCell(s.status),
        excelCell(s.totalSales, "Number"),
        excelCell(s.totalPurchases, "Number"),
        excelCell(s.inventoryValue, "Number"),
        excelCell(s.lastSync ?? ""),
        excelCell(s.error ?? ""),
      ]),
    )
    .join("\n");
  sheets.push(` <Worksheet ss:Name="وضعیت منابع">
  <Table>
${excelRow([
  excelCell("نام"),
  excelCell("کلید"),
  excelCell("وضعیت"),
  excelCell("فروش"),
  excelCell("خرید"),
  excelCell("موجودی"),
  excelCell("آخرین همگام"),
  excelCell("خطا"),
])}
${srcRows}
  </Table>
 </Worksheet>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>مالی‌نمای یکپارچه</Title>
  <Created>${xmlEscape(new Date().toISOString())}</Created>
 </DocumentProperties>
${sheets.join("\n")}
</Workbook>
`;
}

export function downloadDashboardXml(data: DashboardData) {
  const xml = buildDashboardXml(data);
  downloadBlob(
    new Blob([xml], { type: "application/xml;charset=utf-8" }),
    `mali-namay-${stamp()}.xml`,
  );
}

export function downloadDashboardExcel(data: DashboardData) {
  const xml = buildDashboardExcelXml(data);
  // SpreadsheetML — Excel آن را به‌صورت .xls باز می‌کند
  downloadBlob(
    new Blob(["\uFEFF", xml], { type: "application/vnd.ms-excel;charset=utf-8" }),
    `mali-namay-${stamp()}.xls`,
  );
}
