"use client";

import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, toFaDigits } from "@/lib/format";
import type { CategoryBreakdown, MonthlyPoint } from "@/lib/types";
import { LabelWithHelp } from "./HelpTip";

const NO_ANIM = { isAnimationActive: false as const };
const COLORS = ["#0b5cab", "#c2410c", "#0f766e", "#b45309", "#475569"];

/** برچسب کوتاه محور برای جلوگیری از توهم‌رفتن نوشته‌ها */
function axisMoney(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return toFaDigits((n / 1_000_000_000).toFixed(1)) + " میلیارد";
  }
  if (abs >= 1_000_000) {
    return toFaDigits(Math.round(n / 1_000_000)) + " م";
  }
  if (abs >= 1_000) {
    return toFaDigits(Math.round(n / 1_000)) + " هـ";
  }
  return toFaDigits(Math.round(n));
}

function shortLabel(text: string, max = 12): string {
  const t = text?.trim() || "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function ChartCard({
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
      {/* LTR برای چیدمان درست Recharts؛ متن فارسی داخل برچسب‌ها می‌ماند */}
      <div
        className={`chart-shell w-full ${tall ? "h-[26rem]" : "h-[22rem]"}`}
        dir="ltr"
      >
        {children}
      </div>
    </section>
  );
}

const tipStyle = {
  borderRadius: 12,
  border: "2px solid #c5d0dc",
  fontSize: 15,
  padding: "10px 12px",
  direction: "rtl" as const,
  textAlign: "right" as const,
};

export const SalesPurchaseTrend = memo(function SalesPurchaseTrend({
  data,
}: {
  data: MonthlyPoint[];
}) {
  return (
    <ChartCard
      title="روند فروش و خرید"
      subtitle="مقایسه ماه‌به‌ماه از همه سیستم‌های فعال"
      help="خط آبی فروش و خط نارنجی خرید است. اگر فروش بالاتر از خرید باشد، معمولاً وضعیت بهتر است."
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: 8, bottom: 48 }}
        >
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0b5cab" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0b5cab" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="buyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c2410c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#c2410c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#c5d0dc" />
          <XAxis
            dataKey="month"
            interval={0}
            angle={-40}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 11, fill: "#0b1f33" }}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={(v) => axisMoney(Number(v))}
            width={72}
            tick={{ fontSize: 11, fill: "#0b1f33" }}
            tickMargin={6}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={tipStyle}
          />
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: 14, paddingBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            name="فروش"
            stroke="#0b5cab"
            fill="url(#salesFill)"
            strokeWidth={3}
            {...NO_ANIM}
          />
          <Area
            type="monotone"
            dataKey="purchases"
            name="خرید"
            stroke="#c2410c"
            fill="url(#buyFill)"
            strokeWidth={3}
            {...NO_ANIM}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});

export const CategoryBars = memo(function CategoryBars({
  title,
  subtitle,
  help,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  help?: string;
  data: CategoryBreakdown[];
  color: string;
}) {
  const chartData = useMemo(
    () =>
      data.slice(0, 8).map((row) => ({
        ...row,
        label: shortLabel(row.category, 14),
      })),
    [data],
  );

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      help={
        help ||
        "هر نوار یک گروه کالا است؛ هرچه بلندتر باشد، مبلغ آن گروه بیشتر بوده."
      }
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          barCategoryGap="18%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#c5d0dc" horizontal />
          <XAxis
            type="number"
            tickFormatter={(v) => axisMoney(Number(v))}
            tick={{ fontSize: 11, fill: "#0b1f33" }}
            tickMargin={6}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={108}
            tick={{ fontSize: 12, fill: "#0b1f33" }}
            tickMargin={8}
            interval={0}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            labelFormatter={(_, payload) => {
              const full = payload?.[0]?.payload?.category;
              return full || "";
            }}
            contentStyle={tipStyle}
          />
          <Bar
            dataKey="amount"
            name="مبلغ"
            fill={color}
            radius={[0, 8, 8, 0]}
            maxBarSize={28}
            {...NO_ANIM}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});

export const InventoryPie = memo(function InventoryPie({
  data,
}: {
  data: CategoryBreakdown[];
}) {
  const chartData = useMemo(
    () =>
      data.slice(0, 6).map((row) => ({
        ...row,
        name: shortLabel(row.category, 16),
      })),
    [data],
  );

  return (
    <ChartCard
      title="موجودی به تفکیک گروه کالا"
      subtitle="سهم هر گروه از ارزش ریالی انبار"
      help="دایره نشان می‌دهد موجودی انبار بیشتر در کدام گروه کالا جمع شده است."
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="name"
            cx="42%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            {...NO_ANIM}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={tipStyle}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{
              fontSize: 13,
              lineHeight: "22px",
              paddingRight: 4,
              maxWidth: 140,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
