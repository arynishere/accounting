"use client";

import Link from "next/link";
import type { ReportDef, ReportGroup } from "@/lib/reports-catalog";
import { toFaDigits } from "@/lib/format";
import { HelpTip } from "./HelpTip";

function modeLabel(mode: ReportDef["dataMode"]) {
  if (mode === "live") return { text: "واقعی", cls: "status-ok" };
  if (mode === "hybrid") return { text: "ترکیبی", cls: "status-mock" };
  return { text: "نمونه", cls: "status-mock" };
}

export function ReportList({
  group,
  title,
  subtitle,
  reports,
}: {
  group: ReportGroup;
  title: string;
  subtitle: string;
  reports: ReportDef[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--text-2xl)] font-extrabold text-[var(--ink)]">
          {title}
        </h2>
        <p className="mt-2 text-base text-[var(--muted)]">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => {
          const mode = modeLabel(r.dataMode);
          return (
            <Link
              key={r.id}
              href={`/${group}/${r.id}`}
              className="panel kpi-clickable block no-underline transition hover:border-[var(--accent-hot)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--accent-hot)]">
                    اولویت {toFaDigits(r.priority)}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold text-[var(--ink)]">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-[var(--muted)]">
                    {r.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.fields.slice(0, 4).map((f) => (
                      <span
                        key={f}
                        className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--accent-deep)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-bold text-[var(--accent-hot)]">
                    مشاهده گزارش ←
                  </p>
                </div>
                <span className={`status-pill ${mode.cls}`}>{mode.text}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-[var(--muted)]">
        گزارش‌های «نمونه» تا تأیید API فرصت/خزانه با داده دمو کار می‌کنند.
        <HelpTip text="ترکیبی یعنی بخشی از اعداد از CRM/هلو/سپیدار و بقیه نمونه است." />
      </p>
    </div>
  );
}
