"use client";

import { memo, useMemo } from "react";
import {
  Area,
  Bar,
  Brush,
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
  BarChart,
} from "recharts";
import { formatMoney, toFaDigits } from "@/lib/format";
import type { CategoryBreakdown, MonthlyPoint } from "@/lib/types";
import { LabelWithHelp } from "./HelpTip";

const NO_ANIM = { isAnimationActive: false as const };
const COLORS = ["#ea580c", "#dc2626", "#f97316", "#b91c1c", "#fb923c", "#991b1b"];

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
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[var(--text-lg)] font-extrabold text-[var(--ink)]">
            <LabelWithHelp help={help}>{title}</LabelWithHelp>
          </h2>
          <p className="mt-1 text-base text-[var(--muted)]">{subtitle}</p>
        </div>
        <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent-deep)]">
          Power BI style
        </span>
      </header>
      <div
        className={`chart-shell w-full ${tall ? "h-[28rem]" : "h-[22rem]"}`}
        dir="ltr"
      >
        {children}
      </div>
    </section>
  );
}

const tipStyle = {
  borderRadius: 12,
  border: "2px solid #fdba74",
  background: "#fffaf7",
  fontSize: 15,
  padding: "10px 12px",
  direction: "rtl" as const,
  textAlign: "right" as const,
  boxShadow: "0 8px 24px rgba(194,65,12,0.15)",
};

export const SalesPurchaseTrend = memo(function SalesPurchaseTrend({
  data,
  onBrushRange,
}: {
  data: MonthlyPoint[];
  /** اندیس ماه‌های انتخاب‌شده با دستگیره پایین نمودار */
  onBrushRange?: (indices: number[] | null) => void;
}) {
  const chartData = useMemo(
    () =>
      data.map((row, index) => ({
        ...row,
        index,
        profit: row.sales - row.purchases,
      })),
    [data],
  );

  return (
    <ChartCard
      title="روند فروش، خرید و سود"
      subtitle="بازه را از پایین نمودار بکشید یا از فیلتر تاریخ بالا اعمال کنید"
      help="ستون نارنجی فروش، ستون قرمز خرید و خط تیره سود است. دستگیره پایین برای محدود کردن ماه‌هاست."
      tall
    >
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <ComposedChart
          data={chartData}
          margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="salesBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
              <stop offset="100%" stopColor="#ea580c" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="buyBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
            </linearGradient>
            <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#991b1b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" vertical={false} />
          <XAxis
            dataKey="month"
            interval={0}
            angle={-35}
            textAnchor="end"
            height={52}
            tick={{ fontSize: 11, fill: "#7c2d12" }}
            tickMargin={8}
            axisLine={{ stroke: "#fdba74" }}
          />
          <YAxis
            tickFormatter={(v) => axisMoney(Number(v))}
            width={72}
            tick={{ fontSize: 11, fill: "#7c2d12" }}
            tickMargin={6}
            axisLine={{ stroke: "#fdba74" }}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value ?? 0)),
              String(name),
            ]}
            contentStyle={tipStyle}
          />
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: 14, paddingBottom: 4 }}
          />
          <Bar
            dataKey="sales"
            name="فروش"
            fill="url(#salesBar)"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
            {...NO_ANIM}
          />
          <Bar
            dataKey="purchases"
            name="خرید"
            fill="url(#buyBar)"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
            {...NO_ANIM}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="سود"
            stroke="none"
            fill="url(#profitArea)"
            {...NO_ANIM}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="روند سود"
            stroke="#7f1d1d"
            strokeWidth={3}
            dot={{ r: 3, fill: "#fff", stroke: "#7f1d1d", strokeWidth: 2 }}
            {...NO_ANIM}
          />
          <Brush
            dataKey="month"
            height={28}
            stroke="#ea580c"
            fill="#ffedd5"
            travellerWidth={10}
            tickFormatter={(v) => shortLabel(String(v), 6)}
            onChange={(range) => {
              if (!onBrushRange) return;
              if (!range || range.startIndex == null || range.endIndex == null) {
                onBrushRange(null);
                return;
              }
              const start = Math.min(range.startIndex, range.endIndex);
              const end = Math.max(range.startIndex, range.endIndex);
              const indices: number[] = [];
              for (let i = start; i <= end; i++) indices.push(i);
              onBrushRange(indices);
            }}
          />
        </ComposedChart>
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
          <defs>
            <linearGradient id={`bar-${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.75} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" horizontal />
          <XAxis
            type="number"
            tickFormatter={(v) => axisMoney(Number(v))}
            tick={{ fontSize: 11, fill: "#7c2d12" }}
            tickMargin={6}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={108}
            tick={{ fontSize: 12, fill: "#7c2d12" }}
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
            fill={`url(#bar-${color.replace("#", "")})`}
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
      subtitle="دونات ارزش ریالی انبار — پالت نارنجی/قرمز"
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
            innerRadius={58}
            outerRadius={96}
            paddingAngle={3}
            stroke="#fff"
            strokeWidth={2}
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
