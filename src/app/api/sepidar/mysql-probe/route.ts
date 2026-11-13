import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { probeSepidarMysql } from "@/lib/adapters/sepidar-mysql";
import type { SourceConfig } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<SourceConfig>;
    const config = await loadConfig();
    const merged: SourceConfig = {
      ...config.sepidar,
      ...body,
      password:
        body.password && !String(body.password).includes("•")
          ? body.password
          : config.sepidar.password,
    };

    const result = await probeSepidarMysql(merged);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, tables: [] },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      version: result.version,
      tables: result.tables,
      hint:
        result.tables.some((t) =>
          ["mali_sales_invoices", "mali_purchase_invoices", "mali_inventory"].includes(
            t.toLowerCase(),
          ),
        )
          ? "ویوهای مالی‌نما پیدا شد."
          : "ویوهای mali_* نیست؛ کشف خودکار جداول Invoice/Item امتحان می‌شود. در صورت نیاز docs/sepidar-mysql-views.sql را اجرا کنید.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "خطای تست MySQL",
      },
      { status: 500 },
    );
  }
}
