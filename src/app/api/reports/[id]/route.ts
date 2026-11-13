import { NextResponse } from "next/server";
import { getReportPayload } from "@/lib/get-report";
import { isValidRange, type DateRange } from "@/lib/date-range";
import {
  buildReportExcelXml,
  buildReportXml,
} from "@/lib/report-export-build";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const format = (url.searchParams.get("format") || "").toLowerCase();
    const range: DateRange | null =
      from && to && isValidRange({ from, to }) ? { from, to } : null;

    const data = await getReportPayload(id, range);
    if (!data) {
      return NextResponse.json({ error: "گزارش پیدا نشد" }, { status: 404 });
    }

    if (format === "xml") {
      return new NextResponse(buildReportXml(data), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="report-${id}.xml"`,
        },
      });
    }
    if (format === "xls" || format === "excel") {
      return new NextResponse("\uFEFF" + buildReportExcelXml(data), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="report-${id}.xls"`,
        },
      });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=10" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطای گزارش" },
      { status: 500 },
    );
  }
}
