import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { buildDashboard } from "@/lib/adapters";

export async function GET() {
  try {
    const config = await loadConfig();
    const data = await buildDashboard(config);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "خطای سرور",
      },
      { status: 500 },
    );
  }
}
