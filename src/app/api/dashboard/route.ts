import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/get-dashboard";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("refresh") === "1";
    const data = await getDashboardData(force);

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
