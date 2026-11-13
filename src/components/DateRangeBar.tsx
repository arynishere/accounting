"use client";

import { CalendarRange } from "lucide-react";
import type { DateRange } from "@/lib/date-range";
import { DATE_PRESETS, isValidRange } from "@/lib/date-range";
import { toFaDigits } from "@/lib/format";
import { HelpTip } from "./HelpTip";

type Props = {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  onApply: () => void;
  applying?: boolean;
};

export function DateRangeBar({ from, to, onChange, onApply, applying }: Props) {
  const valid = isValidRange({ from, to } as DateRange);

  return (
    <section className="panel !py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={22} className="text-[var(--accent-hot)]" />
          <h3 className="text-lg font-extrabold text-[var(--ink)]">
            بازه تاریخ نمودار
          </h3>
          <HelpTip text="از تاریخ تا تاریخ را مشخص کنید و «اعمال بازه» بزنید تا نمودار و خروجی همان بازه را نشان دهد. پایین نمودار روند هم می‌توانید ماه‌ها را با دستگیره بکشید و محدود کنید." />
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn-secondary !px-3 !py-2 !text-sm"
              onClick={() => onChange(p.range())}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm font-bold text-[var(--muted)]">
          از تاریخ
          <input
            type="date"
            className="field"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange({ from: e.target.value, to })}
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm font-bold text-[var(--muted)]">
          تا تاریخ
          <input
            type="date"
            className="field"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange({ from, to: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          disabled={!valid || applying}
          onClick={onApply}
        >
          {applying ? "در حال اعمال..." : "اعمال بازه روی نمودار"}
        </button>
      </div>

      {from && to && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          بازه فعال: {toFaDigits(from)} تا {toFaDigits(to)}
          {!valid && (
            <span className="mr-2 text-red-700">
              — تاریخ «از» باید قبل از «تا» باشد
            </span>
          )}
        </p>
      )}
    </section>
  );
}
