"use client";

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
import { formatCompact, formatMoney } from "@/lib/format";
import type { CategoryBreakdown, MonthlyPoint } from "@/lib/types";

const COLORS = ["#0f766e", "#c2410c", "#0369a1", "#a16207", "#4b5563"];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel animate-rise">
      <header className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
          {title}
        </h2>
        <p className="text-sm text-[var(--muted)]">{subtitle}</p>
      </header>
      <div className="h-72 w-full">{children}</div>
    </section>
  );
}

export function SalesPurchaseTrend({ data }: { data: MonthlyPoint[] }) {
  return (
    <ChartCard
      title="روند فروش و خرید"
      subtitle="مقایسه ماهانه تجمیعی از همه منابع فعال"
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="buyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c2410c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#c2410c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => formatCompact(Number(v))}
            width={70}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={{ borderRadius: 12, borderColor: "#e7e5e4" }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="sales"
            name="فروش"
            stroke="#0f766e"
            fill="url(#salesFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="purchases"
            name="خرید"
            stroke="#c2410c"
            fill="url(#buyFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CategoryBars({
  title,
  subtitle,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  data: CategoryBreakdown[];
  color: string;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCompact(Number(v))}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={110}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={{ borderRadius: 12, borderColor: "#e7e5e4" }}
          />
          <Bar dataKey="amount" name="مبلغ" fill={color} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function InventoryPie({ data }: { data: CategoryBreakdown[] }) {
  return (
    <ChartCard
      title="موجودی به تفکیک گروه کالا"
      subtitle="ارزش ریالی موجودی انبار از منابع متصل"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={{ borderRadius: 12, borderColor: "#e7e5e4" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
