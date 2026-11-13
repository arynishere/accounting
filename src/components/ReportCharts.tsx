"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, toFaDigits } from "@/lib/format";
import type { ReportSeriesPoint } from "@/lib/report-types";

const NO_ANIM = { isAnimationActive: false as const };
const COLORS = ["#ea580c", "#dc2626", "#f97316", "#b91c1c", "#fb923c", "#991b1b"];

function axisMoney(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return toFaDigits((n / 1_000_000_000).toFixed(1)) + " میلیارد";
  if (abs >= 1_000_000) return toFaDigits(Math.round(n / 1_000_000)) + " م";
  if (abs >= 1_000) return toFaDigits(Math.round(n / 1_000)) + " هـ";
  return toFaDigits(Math.round(n));
}

const tipStyle = {
  borderRadius: 12,
  border: "2px solid #fdba74",
  background: "#fffaf7",
  fontSize: 14,
  padding: "8px 10px",
  direction: "rtl" as const,
  textAlign: "right" as const,
};

export const ReportOverviewChart = memo(function ReportOverviewChart({
  data,
  label,
  label2,
  label3,
}: {
  data: ReportSeriesPoint[];
  label?: string;
  label2?: string;
  label3?: string;
}) {
  const has2 = data.some((d) => d.value2 != null);
  const has3 = data.some((d) => d.value3 != null);

  return (
    <section className="panel overflow-hidden">
      <h3 className="mb-3 text-lg font-extrabold">نمودار کلی</h3>
      <div className="chart-shell h-[24rem] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" vertical={false} />
            <XAxis dataKey="label" interval={0} angle={-30} textAnchor="end" height={56} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <YAxis tickFormatter={(v) => axisMoney(Number(v))} width={70} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} contentStyle={tipStyle} />
            <Legend verticalAlign="top" height={28} />
            <Bar dataKey="value" name={label || "مقدار"} fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={26} {...NO_ANIM} />
            {has2 && (
              <Bar dataKey="value2" name={label2 || "مقدار ۲"} fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={26} {...NO_ANIM} />
            )}
            {has3 && (
              <Line type="monotone" dataKey="value3" name={label3 || "مقدار ۳"} stroke="#7f1d1d" strokeWidth={3} {...NO_ANIM} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export const ReportBreakdownChart = memo(function ReportBreakdownChart({
  title,
  data,
}: {
  title: string;
  data: ReportSeriesPoint[];
}) {
  const chartData = useMemo(
    () => data.slice(0, 8).map((d) => ({ ...d, name: d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label })),
    [data],
  );

  if (!chartData.length) return null;

  return (
    <section className="panel overflow-hidden">
      <h3 className="mb-3 text-lg font-extrabold">{title || "ریز تفکیک"}</h3>
      <div className="chart-shell h-[22rem] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="45%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
              {...NO_ANIM}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} contentStyle={tipStyle} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

export const ReportBarsChart = memo(function ReportBarsChart({
  data,
  label,
}: {
  data: ReportSeriesPoint[];
  label?: string;
}) {
  const chartData = useMemo(
    () => data.slice(0, 10).map((d) => ({ ...d, short: d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label })),
    [data],
  );

  return (
    <section className="panel overflow-hidden">
      <h3 className="mb-3 text-lg font-extrabold">ریز میله‌ای</h3>
      <div className="chart-shell h-[22rem] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" horizontal />
            <XAxis type="number" tickFormatter={(v) => axisMoney(Number(v))} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <YAxis type="category" dataKey="short" width={100} tick={{ fontSize: 11, fill: "#7c2d12" }} interval={0} />
            <Tooltip
              formatter={(v) => formatMoney(Number(v ?? 0))}
              labelFormatter={(_, p) => p?.[0]?.payload?.label || ""}
              contentStyle={tipStyle}
            />
            <Bar dataKey="value" name={label || "مقدار"} fill="#ea580c" radius={[0, 8, 8, 0]} maxBarSize={26} {...NO_ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
