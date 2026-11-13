import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/get-dashboard";
import { isValidRange, type DateRange } from "@/lib/date-range";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("refresh") === "1";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const range: DateRange | null =
      from && to && isValidRange({ from, to }) ? { from, to } : null;

    const data = await getDashboardData(force, range);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=15",
        "X-Cache": force ? "BYPASS" : "HIT",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "خطای سرور",
      },
      { status: 500 },
    );
  }
}
