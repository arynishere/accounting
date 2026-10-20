import { NextResponse } from "next/server";
import { loadConfig, saveConfig } from "@/lib/config";
import { registerSepidarDevice } from "@/lib/adapters/sepidar";

export async function POST() {
  try {
    const config = await loadConfig();
    const sepidar = config.sepidar;

    if (!sepidar.baseUrl || !sepidar.deviceSerial) {
      return NextResponse.json(
        { error: "آدرس پایه و سریال دستگاه را در تنظیمات ذخیره کنید" },
        { status: 400 },
      );
    }

    const result = await registerSepidarDevice(sepidar);
    const next = {
      ...config,
      sepidar: {
        ...sepidar,
        rsaPublicKeyXml: result.rsaPublicKeyXml,
        integrationId: String(result.integrationId),
        useMock: false,
      },
    };
    await saveConfig(next);

    return NextResponse.json({
      ok: true,
      deviceTitle: result.deviceTitle,
      integrationId: result.integrationId,
      hasPublicKey: Boolean(result.rsaPublicKeyXml),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطای ثبت دستگاه" },
      { status: 400 },
    );
  }
}
