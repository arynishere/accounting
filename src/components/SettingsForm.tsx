"use client";

import { useEffect, useState } from "react";
import type { AppConfig, SourceConfig } from "@/lib/types";
import { LabelWithHelp } from "./HelpTip";

const emptySource = (): SourceConfig => ({
  enabled: true,
  baseUrl: "",
  apiKey: "",
  username: "",
  password: "",
  companyId: "",
  dbName: "",
  crmDialect: "payamgostar",
  crmTypeKey: "",
  crmQuery: "",
  useMock: true,
  deviceSerial: "",
  integrationId: "",
  rsaPublicKeyXml: "",
  generationVersion: "101",
});

const empty: AppConfig = {
  crm: {
    ...emptySource(),
    baseUrl: "https://crm.payamgostar.com",
    crmDialect: "payamgostar",
  },
  helo: {
    ...emptySource(),
    baseUrl: "http://127.0.0.1:8080/TncHoloo/api",
    dbName: "Holoo1",
  },
  sepidar: {
    ...emptySource(),
    baseUrl: "http://127.0.0.1:7373",
    generationVersion: "101",
  },
  salesTarget: 5_000_000_000,
};

const titles = {
  crm: "CRM پیام‌گستر (PayamGostar)",
  helo: "وب‌سرویس هلو (TncHoloo)",
  sepidar: "وب‌سرویس سپیدار (فروشگاهی)",
} as const;

const titleHelp = {
  crm: "تنظیمات اتصال به نرم‌افزار CRM پیام‌گستر. اگر مطمئن نیستید، حالت نمونه را روشن بگذارید.",
  helo: "تنظیمات اتصال به حسابداری هلو. معمولاً آدرس شبیه http://IP:8080/TncHoloo/api است.",
  sepidar: "تنظیمات اتصال به سپیدار. بعد از وارد کردن سریال، دکمه ثبت دستگاه را بزنید.",
} as const;

type SourceKey = "crm" | "helo" | "sepidar";

function SourceFields({
  sourceKey,
  value,
  onChange,
  onRegister,
  registering,
}: {
  sourceKey: SourceKey;
  value: SourceConfig;
  onChange: (next: SourceConfig) => void;
  onRegister?: () => void;
  registering?: boolean;
}) {
  const set = <K extends keyof SourceConfig>(key: K, v: SourceConfig[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <section className="panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[var(--text-lg)] font-extrabold">
          <LabelWithHelp help={titleHelp[sourceKey]}>
            {titles[sourceKey]}
          </LabelWithHelp>
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          فعال
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={value.useMock}
          onChange={(e) => set("useMock", e.target.checked)}
        />
        استفاده از داده‌های نمونه (تا زمان اتصال واقعی)
      </label>

      {sourceKey === "crm" && (
        <p className="rounded-xl bg-[var(--accent-soft)]/60 px-3 py-2 text-xs leading-6 text-[var(--ink)]">
          پیام‌گستر از وب‌سرویس‌های <strong>SOAP/WCF</strong> استفاده می‌کند
          (مسیر <code>/Services/API</code>). آدرس نمونه:{" "}
          <code>https://crm.yourdomain.com</code> — فروش از{" "}
          <code>IInvoice.SearchInvoice</code>، خرید از{" "}
          <code>SearchPurchaseInvoice</code>، موجودی از{" "}
          <code>IInventory.GetRemainingStock</code>. PDF نسخه Customer 2.5.1
          فقط Release Notes است.
        </p>
      )}

      {sourceKey === "helo" && (
        <p className="rounded-xl bg-[var(--accent-soft)]/60 px-3 py-2 text-xs leading-6 text-[var(--ink)]">
          مطابق مستند هلو: آدرس{" "}
          <strong>http://IP:8080/TncHoloo/api</strong> — لاگین با{" "}
          <code>username / userpass(Base64) / dbname</code> سپس{" "}
          <code>Authorization: Bearer …</code>. موجودی از{" "}
          <code>/Product</code> و فروش/خرید از <code>/Invoice</code>.
        </p>
      )}

      {sourceKey === "sepidar" && (
        <p className="rounded-xl bg-[var(--accent-soft)]/60 px-3 py-2 text-xs leading-6 text-[var(--ink)]">
          مطابق مستند سپیدار: سرویس‌دهنده روی پورت پیش‌فرض{" "}
          <strong>7373</strong>، احراز هویت با Register دستگاه (AES) + Login
          (MD5/JWT). این وب‌سرویس فاکتور فروش و موجودی دارد؛ فاکتور خرید ندارد.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="آدرس پایه API"
          value={value.baseUrl}
          onChange={(v) => set("baseUrl", v)}
          placeholder={
            sourceKey === "sepidar"
              ? "http://IP-سرور-سپیدار:7373"
              : sourceKey === "helo"
                ? "http://IP:8080/TncHoloo/api"
                : sourceKey === "crm"
                  ? "https://crm.payamgostar.com"
                  : "https://..."
          }
        />

        {sourceKey === "crm" && value.crmDialect === "rest" && (
          <Field
            label="API Key / Token"
            value={value.apiKey}
            onChange={(v) => set("apiKey", v)}
            type="password"
          />
        )}

        <Field
          label="نام کاربری"
          value={value.username ?? ""}
          onChange={(v) => set("username", v)}
        />
        <Field
          label={
            sourceKey === "helo"
              ? "رمز عبور (ساده؛ خودکار Base64 می‌شود)"
              : "رمز عبور"
          }
          value={value.password ?? ""}
          onChange={(v) => set("password", v)}
          type="password"
        />

        {sourceKey === "crm" && (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">نوع اتصال CRM</span>
              <select
                className="field"
                value={value.crmDialect || "payamgostar"}
                onChange={(e) =>
                  set(
                    "crmDialect",
                    e.target.value as SourceConfig["crmDialect"],
                  )
                }
              >
                <option value="payamgostar">پیام‌گستر (SOAP)</option>
                <option value="rest">REST سفارشی</option>
              </select>
            </label>
            <Field
              label="typeKey (اختیاری)"
              value={value.crmTypeKey ?? ""}
              onChange={(v) => set("crmTypeKey", v)}
              placeholder="کلید نوع فاکتور"
            />
            <Field
              label="query جستجو (اختیاری)"
              value={value.crmQuery ?? ""}
              onChange={(v) => set("crmQuery", v)}
              placeholder="خالی = همه (طبق دسترسی کاربر)"
            />
          </>
        )}

        {sourceKey === "helo" && (
          <Field
            label="نام بانک اطلاعاتی (dbname)"
            value={value.dbName || value.companyId || ""}
            onChange={(v) => set("dbName", v)}
            placeholder="Holoo1"
          />
        )}

        {sourceKey === "sepidar" && (
          <>
            <Field
              label="سریال دستگاه (۸ کاراکتر)"
              value={value.deviceSerial ?? ""}
              onChange={(v) => set("deviceSerial", v)}
              placeholder="مثلاً 10017ff3"
            />
            <Field
              label="IntegrationID"
              value={value.integrationId ?? ""}
              onChange={(v) => set("integrationId", v)}
              placeholder="چهار رقم اول سریال (خودکار)"
            />
            <Field
              label="GenerationVersion"
              value={value.generationVersion ?? "101"}
              onChange={(v) => set("generationVersion", v)}
              placeholder="101"
            />
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">
                کلید عمومی RSA (پس از Register پر می‌شود)
              </span>
              <textarea
                className="field min-h-24 font-mono text-xs"
                value={
                  value.rsaPublicKeyXml?.includes("•")
                    ? value.rsaPublicKeyXml
                    : (value.rsaPublicKeyXml ?? "")
                }
                onChange={(e) => set("rsaPublicKeyXml", e.target.value)}
                placeholder="<RSAKeyValue>...</RSAKeyValue>"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="button"
                className="btn-primary"
                disabled={registering}
                onClick={onRegister}
              >
                {registering
                  ? "در حال Register..."
                  : "ثبت دستگاه در سپیدار (Register)"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-base">
      <span className="mb-1.5 flex items-center gap-1.5 font-semibold text-[var(--muted)]">
        {label}
      </span>
      <input
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SettingsForm() {
  const [config, setConfig] = useState<AppConfig>(empty);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/config");
      if (res.ok) setConfig(await res.json());
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("ذخیره ناموفق بود");
      const json = await res.json();
      setConfig(json.config);
      setMessage("تنظیمات با موفقیت ذخیره شد.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function registerSepidar() {
    setRegistering(true);
    setMessage(null);
    try {
      // ابتدا تنظیمات فعلی را ذخیره کن
      const saveRes = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!saveRes.ok) throw new Error("ذخیره قبل از Register ناموفق بود");

      const res = await fetch("/api/sepidar/register", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Register ناموفق بود");

      const cfgRes = await fetch("/api/config");
      if (cfgRes.ok) setConfig(await cfgRes.json());
      setMessage(
        `دستگاه «${json.deviceTitle}» ثبت شد (IntegrationID: ${json.integrationId}). حالت نمونه خاموش شد.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--text-2xl)] font-extrabold">
          <LabelWithHelp help="در این صفحه مشخصات ورود به هر نرم‌افزار را وارد می‌کنید تا داشبورد بتواند اطلاعات واقعی بخواند.">
            اتصال به سیستم‌ها
          </LabelWithHelp>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-[var(--muted)]">
          روی علامت سؤال کنار هر مورد بروید تا توضیح ساده ببینید. اگر هنوز
          اطلاعات سرور را ندارید، «داده‌های نمونه» را روشن بگذارید.
        </p>
      </div>

      <section className="panel space-y-4">
        <h2 className="text-[var(--text-lg)] font-extrabold">
          <LabelWithHelp help="هدف فروش دوره برای گزارش «فروش واقعی و تحقق هدف». واحد: ریال.">
            هدف فروش دوره
          </LabelWithHelp>
        </h2>
        <Field
          label="هدف فروش (ریال)"
          type="number"
          value={String(config.salesTarget ?? "")}
          onChange={(v) =>
            setConfig((c) => ({
              ...c,
              salesTarget: Number(v) || 0,
            }))
          }
          placeholder="مثلاً 5000000000"
        />
      </section>

      {(Object.keys(titles) as SourceKey[]).map((key) => (
        <SourceFields
          key={key}
          sourceKey={key}
          value={config[key]}
          onChange={(next) => setConfig((c) => ({ ...c, [key]: next }))}
          onRegister={key === "sepidar" ? () => void registerSepidar() : undefined}
          registering={registering}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
        {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
      </div>
    </div>
  );
}
