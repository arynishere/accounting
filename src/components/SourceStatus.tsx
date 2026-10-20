"use client";

import { formatCompact, toFaDigits } from "@/lib/format";
import type { SourceMetrics } from "@/lib/types";

const statusMap = {
  connected: { label: "متصل", className: "status-ok" },
  mock: { label: "حالت نمونه", className: "status-mock" },
  error: { label: "خطا", className: "status-err" },
  disconnected: { label: "غیرفعال", className: "status-off" },
} as const;

export function SourceStatus({ sources }: { sources: SourceMetrics[] }) {
  return (
    <section className="panel animate-rise">
      <header className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          وضعیت منابع داده
        </h2>
        <p className="text-sm text-[var(--muted)]">
          CRM، نرم‌افزار هلو و سپیدار
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {sources.map((source) => {
          const st = statusMap[source.status];
          return (
            <article
              key={source.source}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--ink)]">{source.label}</h3>
                <span className={`status-pill ${st.className}`}>{st.label}</span>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                <div className="flex justify-between gap-2">
                  <dt>فروش</dt>
                  <dd className="text-[var(--ink)]">
                    {formatCompact(source.totalSales)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>خرید</dt>
                  <dd className="text-[var(--ink)]">
                    {formatCompact(source.totalPurchases)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>موجودی</dt>
                  <dd className="text-[var(--ink)]">
                    {formatCompact(source.inventoryValue)}
                  </dd>
                </div>
              </dl>
              {source.error && (
                <p className="mt-2 text-xs text-red-700">{source.error}</p>
              )}
              {source.lastSync && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  آخرین همگام‌سازی:{" "}
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
