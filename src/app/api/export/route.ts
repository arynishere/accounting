import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/get-dashboard";
import {
  buildDashboardExcelXml,
  buildDashboardXml,
} from "@/lib/export";
import { isValidRange, type DateRange } from "@/lib/date-range";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "xml").toLowerCase();
    const force = url.searchParams.get("refresh") === "1";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const range: DateRange | null =
      from && to && isValidRange({ from, to }) ? { from, to } : null;

    const data = await getDashboardData(force, range);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === "xls" || format === "excel" || format === "xlsx") {
      const body = "\uFEFF" + buildDashboardExcelXml(data);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="mali-namay-${stamp}.xls"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const body = buildDashboardXml(data);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="mali-namay-${stamp}.xml"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطای خروجی" },
      { status: 500 },
    );
  }
}
