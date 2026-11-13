"use client";

import { memo, useMemo } from "react";
import {
  Area,
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
import type { CategoryBreakdown } from "@/lib/types";
import { LabelWithHelp } from "./HelpTip";

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

function shortLabel(text: string, max = 14): string {
  const t = text?.trim() || "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

const tipStyle = {
  borderRadius: 12,
  border: "2px solid #fdba74",
  background: "#fffaf7",
  fontSize: 15,
  padding: "10px 12px",
  direction: "rtl" as const,
  textAlign: "right" as const,
};

function Card({
  title,
  subtitle,
  help,
  children,
  tall,
}: {
  title: string;
  subtitle: string;
  help: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <section className="panel animate-rise overflow-hidden">
      <header className="mb-3">
        <h2 className="text-[var(--text-lg)] font-extrabold text-[var(--ink)]">
          <LabelWithHelp help={help}>{title}</LabelWithHelp>
        </h2>
        <p className="mt-1 text-base text-[var(--muted)]">{subtitle}</p>
      </header>
      <div className={`chart-shell w-full ${tall ? "h-[28rem]" : "h-[22rem]"}`} dir="ltr">
        {children}
      </div>
    </section>
  );
}

export const MetricOverviewChart = memo(function MetricOverviewChart({
  title,
  data,
  color,
  dual,
}: {
  title: string;
  data: Array<{ month: string; value: number; sales?: number; purchases?: number }>;
  color: string;
  dual?: boolean;
}) {
  return (
    <Card
      title={title}
      subtitle="نمای کلی در طول ماه‌ها"
      help="این نمودار روند کلی شاخص انتخاب‌شده را نشان می‌دهد."
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        {dual ? (
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" vertical={false} />
            <XAxis dataKey="month" interval={0} angle={-35} textAnchor="end" height={56} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <YAxis tickFormatter={(v) => axisMoney(Number(v))} width={72} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} contentStyle={tipStyle} />
            <Legend verticalAlign="top" height={28} />
            <Bar dataKey="sales" name="فروش" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={26} {...NO_ANIM} />
            <Bar dataKey="purchases" name="خرید" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={26} {...NO_ANIM} />
            <Line type="monotone" dataKey="value" name="سود" stroke="#7f1d1d" strokeWidth={3} dot={{ r: 3 }} {...NO_ANIM} />
          </ComposedChart>
        ) : (
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 48 }}>
            <defs>
              <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" vertical={false} />
            <XAxis dataKey="month" interval={0} angle={-35} textAnchor="end" height={56} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <YAxis tickFormatter={(v) => axisMoney(Number(v))} width={72} tick={{ fontSize: 11, fill: "#7c2d12" }} />
            <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} contentStyle={tipStyle} />
            <Area type="monotone" dataKey="value" name={title} stroke={color} fill="url(#metricFill)" strokeWidth={3} {...NO_ANIM} />
            <Bar dataKey="value" name="مبلغ" fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} fillOpacity={0.55} {...NO_ANIM} />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
});

export const MetricCategoryBars = memo(function MetricCategoryBars({
  title,
  data,
  color,
}: {
  title: string;
  data: CategoryBreakdown[];
  color: string;
}) {
  const chartData = useMemo(
    () => data.slice(0, 10).map((r) => ({ ...r, label: shortLabel(r.category) })),
    [data],
  );

  return (
    <Card
      title={title}
      subtitle="ریز به تفکیک گروه"
      help="هر نوار یک گروه است؛ برای دیدن مبلغ دقیق روی نوار بمانید."
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }} barCategoryGap="16%">
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" horizontal />
          <XAxis type="number" tickFormatter={(v) => axisMoney(Number(v))} tick={{ fontSize: 11, fill: "#7c2d12" }} />
          <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12, fill: "#7c2d12" }} interval={0} />
          <Tooltip
            formatter={(v) => formatMoney(Number(v ?? 0))}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.category || ""}
            contentStyle={tipStyle}
          />
          <Bar dataKey="amount" name="مبلغ" fill={color} radius={[0, 8, 8, 0]} maxBarSize={28} {...NO_ANIM} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
});

export const MetricSourcePie = memo(function MetricSourcePie({
  title,
  data,
}: {
  title: string;
  data: CategoryBreakdown[];
}) {
  const chartData = useMemo(
    () => data.map((r) => ({ ...r, name: shortLabel(r.category, 16) })),
    [data],
  );

  return (
    <Card
      title={title}
      subtitle="ریز به تفکیک منبع (CRM / هلو / سپیدار)"
      help="سهم هر نرم‌افزار از این شاخص."
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="name"
            cx="42%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
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
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
});
