import { NextResponse } from "next/server";
import { defaultConfig, loadConfig, saveConfig } from "@/lib/config";
import { clearDashboardCache } from "@/lib/dashboard-cache";
import type { AppConfig } from "@/lib/types";

function sanitize(config: AppConfig): AppConfig {
  const mask = (value?: string) =>
    value && value.length > 0 ? "••••••••" : "";

  return {
    crm: {
      ...config.crm,
      apiKey: mask(config.crm.apiKey),
      password: mask(config.crm.password),
    },
    helo: {
      ...config.helo,
      apiKey: mask(config.helo.apiKey),
      password: mask(config.helo.password),
    },
    sepidar: {
      ...config.sepidar,
      apiKey: mask(config.sepidar.apiKey),
      password: mask(config.sepidar.password),
      rsaPublicKeyXml: config.sepidar.rsaPublicKeyXml
        ? mask(config.sepidar.rsaPublicKeyXml)
        : "",
    },
    salesTarget: config.salesTarget,
  };
}

export async function GET() {
  const config = await loadConfig();
  return NextResponse.json(sanitize(config));
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as AppConfig;
    const current = await loadConfig();
    const keepSecret = (incoming: string | undefined, existing: string) =>
      !incoming || incoming.includes("•") ? existing : incoming;

    const next: AppConfig = {
      crm: {
        ...defaultConfig().crm,
        ...current.crm,
        ...body.crm,
        apiKey: keepSecret(body.crm?.apiKey, current.crm.apiKey),
        password: keepSecret(body.crm?.password, current.crm.password ?? ""),
      },
      helo: {
        ...defaultConfig().helo,
        ...current.helo,
        ...body.helo,
        apiKey: keepSecret(body.helo?.apiKey, current.helo.apiKey),
        password: keepSecret(body.helo?.password, current.helo.password ?? ""),
      },
      sepidar: {
        ...defaultConfig().sepidar,
        ...current.sepidar,
        ...body.sepidar,
        apiKey: keepSecret(body.sepidar?.apiKey, current.sepidar.apiKey),
        password: keepSecret(
          body.sepidar?.password,
          current.sepidar.password ?? "",
        ),
        rsaPublicKeyXml: keepSecret(
          body.sepidar?.rsaPublicKeyXml,
          current.sepidar.rsaPublicKeyXml ?? "",
        ),
        sepidarDialect:
          body.sepidar?.sepidarDialect ||
          current.sepidar.sepidarDialect ||
          "mysql",
        mysqlHost: body.sepidar?.mysqlHost ?? current.sepidar.mysqlHost,
        mysqlPort: body.sepidar?.mysqlPort ?? current.sepidar.mysqlPort,
        dbName: body.sepidar?.dbName ?? current.sepidar.dbName,
      },
      salesTarget:
        typeof body.salesTarget === "number"
          ? body.salesTarget
          : (current.salesTarget ?? defaultConfig().salesTarget),
    };

    await saveConfig(next);
    clearDashboardCache();
    return NextResponse.json({ ok: true, config: sanitize(next) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطای ذخیره" },
      { status: 400 },
    );
  }
}
