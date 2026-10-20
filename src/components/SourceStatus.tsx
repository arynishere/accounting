"use client";

import { formatCompact, toFaDigits } from "@/lib/format";
import type { SourceMetrics } from "@/lib/types";
import { HelpTip, LabelWithHelp } from "./HelpTip";

const statusMap = {
  connected: {
    label: "متصل",
    className: "status-ok",
    help: "ارتباط برقرار است و داده‌ها از سیستم واقعی خوانده می‌شود.",
  },
  mock: {
    label: "نمونه آموزشی",
    className: "status-mock",
    help: "هنوز به سیستم واقعی وصل نشده؛ اعداد نمایشی/آموزشی هستند.",
  },
  error: {
    label: "خطا",
    className: "status-err",
    help: "اتصال برقرار نشد. تنظیمات یا روشن بودن سرور آن نرم‌افزار را بررسی کنید.",
  },
  disconnected: {
    label: "خاموش",
    className: "status-off",
    help: "این منبع در تنظیمات غیرفعال شده است.",
  },
} as const;

const sourceHelp = {
  crm: "نرم‌افزار CRM پیام‌گستر؛ معمولاً اطلاعات فروش و مشتری از اینجا می‌آید.",
  helo: "نرم‌افزار حسابداری هلو؛ فروش، خرید و موجودی کالا.",
  sepidar: "نرم‌افزار حسابداری سپیدار؛ فروش و موجودی از وب‌سرویس فروشگاهی.",
} as const;

export function SourceStatus({ sources }: { sources: SourceMetrics[] }) {
  return (
    <section className="panel animate-rise">
      <header className="mb-5">
        <h2 className="text-[var(--text-lg)] font-extrabold">
          <LabelWithHelp help="هر کارت نشان می‌دهد یک نرم‌افزار چقدر فروش، خرید و موجودی دارد و وصل است یا نه.">
            وضعیت منابع داده
          </LabelWithHelp>
        </h2>
        <p className="mt-1 text-base text-[var(--muted)]">
          پیام‌گستر، هلو و سپیدار
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {sources.map((source) => {
          const st = statusMap[source.status];
          return (
            <article
              key={source.source}
              className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold text-[var(--ink)]">
                  <LabelWithHelp help={sourceHelp[source.source]}>
                    {source.label}
                  </LabelWithHelp>
                </h3>
                <span className="inline-flex items-center gap-1">
                  <span className={`status-pill ${st.className}`}>{st.label}</span>
                  <HelpTip text={st.help} label="معنی وضعیت" />
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-base text-[var(--muted)]">
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold">فروش</dt>
                  <dd className="font-bold text-[var(--ink)]">
                    {formatCompact(source.totalSales)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold">خرید</dt>
                  <dd className="font-bold text-[var(--ink)]">
                    {formatCompact(source.totalPurchases)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold">موجودی</dt>
                  <dd className="font-bold text-[var(--ink)]">
                    {formatCompact(source.inventoryValue)}
                  </dd>
                </div>
              </dl>
              {source.error && (
                <p className="mt-3 text-base text-red-700">{source.error}</p>
              )}
              {source.lastSync && (
                <p className="mt-3 text-base text-[var(--muted)]">
                  آخرین به‌روزرسانی:{" "}
                  {toFaDigits(
                    new Date(source.lastSync).toLocaleString("fa-IR"),
                  )}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
