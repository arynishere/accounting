import type { DateRange } from "./date-range";
import { MONTH_LABELS } from "./format";
import { getReport } from "./reports-catalog";
import type { ReportPayload, ReportSeriesPoint } from "./report-types";

function seedFrom(id: string, from?: string, to?: string): number {
  const s = `${id}|${from || ""}|${to || ""}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

function rnd(seed: number, i: number, min: number, max: number): number {
  const x = Math.sin(seed * 0.001 + i * 12.9898) * 43758.5453;
  const f = x - Math.floor(x);
  return Math.round(min + f * (max - min));
}

function monthlySeries(seed: number, scale = 1): ReportSeriesPoint[] {
  return MONTH_LABELS.map((label, i) => ({
    label,
    value: rnd(seed, i, 80_000_000, 420_000_000) * scale,
    value2: rnd(seed, i + 20, 40_000_000, 280_000_000) * scale,
    value3: rnd(seed, i + 40, 10_000_000, 120_000_000) * scale,
  }));
}

export function buildMockReport(
  id: string,
  range?: DateRange | null,
): ReportPayload | null {
  const def = getReport(id);
  if (!def) return null;
  const seed = seedFrom(id, range?.from, range?.to);
  const series = monthlySeries(seed);
  const now = new Date().toISOString();

  const base: ReportPayload = {
    id,
    title: def.title,
    summary: def.summary,
    dataMode: def.dataMode,
    generatedAt: now,
    dateFrom: range?.from,
    dateTo: range?.to,
    kpis: [],
    series,
    seriesLabel: "مقدار",
    breakdown: [],
    breakdownTitle: "تفکیک",
    columns: [],
    rows: [],
    alerts: [],
  };

  switch (id) {
    case "actual-vs-target": {
      const sales = series.reduce((s, p) => s + p.value, 0);
      const target = Math.round(sales * 1.15);
      const pct = target ? Math.round((sales / target) * 1000) / 10 : 0;
      return {
        ...base,
        kpis: [
          { label: "فروش خالص", value: sales, format: "money", tone: "sales" },
          { label: "هدف ماهانه/دوره", value: target, format: "money", tone: "buy" },
          { label: "درصد تحقق", value: pct, format: "percent", tone: "profit" },
          { label: "فاصله تا هدف", value: target - sales, format: "money", tone: "warn" },
          { label: "رشد نسبت به دوره مشابه", value: 12.4, format: "percent", tone: "stock" },
        ],
        seriesLabel: "فروش واقعی",
        seriesLabel2: "هدف",
        series: series.map((p, i) => ({
          ...p,
          value2: Math.round(p.value * (1.05 + (i % 3) * 0.03)),
        })),
        breakdown: [
          { label: "حضوری", value: Math.round(sales * 0.42) },
          { label: "تلفنی", value: Math.round(sales * 0.33) },
          { label: "آنلاین", value: Math.round(sales * 0.25) },
        ],
        breakdownTitle: "کانال فروش",
        columns: [
          { key: "month", label: "ماه" },
          { key: "sales", label: "فروش", format: "money" },
          { key: "target", label: "هدف", format: "money" },
          { key: "pct", label: "تحقق %", format: "percent" },
        ],
        rows: series.map((p) => {
          const targetM = Math.round(p.value * 1.12);
          return {
            month: p.label,
            sales: p.value,
            target: targetM,
            pct: Math.round((p.value / targetM) * 1000) / 10,
          };
        }),
      };
    }
    case "pipeline-funnel": {
      const stages = [
        "سرنخ",
        "صلاحیت",
        "پیشنهاد",
        "مذاکره",
        "برنده",
        "متوقف",
      ];
      const counts = stages.map((_, i) => rnd(seed, i, 4, 48));
      const amounts = stages.map((_, i) => rnd(seed, i + 10, 50_000_000, 900_000_000));
      return {
        ...base,
        kpis: [
          { label: "فرصت باز", value: counts.slice(0, 4).reduce((a, b) => a + b, 0), format: "number" },
          { label: "مبلغ فرصت باز", value: amounts.slice(0, 4).reduce((a, b) => a + b, 0), format: "money", tone: "sales" },
          { label: "متوقف‌شده", value: counts[5], format: "number", tone: "warn" },
        ],
        series: stages.map((label, i) => ({ label, value: amounts[i], value2: counts[i] })),
        seriesLabel: "مبلغ",
        seriesLabel2: "تعداد",
        breakdown: stages.map((label, i) => ({ label, value: amounts[i] })),
        breakdownTitle: "قیف فروش",
        columns: [
          { key: "stage", label: "مرحله" },
          { key: "count", label: "تعداد", format: "number" },
          { key: "amount", label: "مبلغ", format: "money" },
          { key: "owner", label: "مسئول نمونه" },
        ],
        rows: stages.map((stage, i) => ({
          stage,
          count: counts[i],
          amount: amounts[i],
          owner: ["رضایی", "محمدی", "کریمی", "احمدی"][i % 4],
        })),
      };
    }
    case "sales-forecast": {
      const expected = series.reduce((s, p) => s + Math.round(p.value * 0.65), 0);
      const target = Math.round(expected * 1.2);
      return {
        ...base,
        kpis: [
          { label: "ارزش مورد انتظار", value: expected, format: "money", tone: "sales" },
          { label: "هدف", value: target, format: "money" },
          { label: "فاصله پیش‌بینی تا هدف", value: target - expected, format: "money", tone: "warn" },
        ],
        seriesLabel: "پیش‌بینی",
        series: series.map((p) => ({ label: p.label, value: Math.round(p.value * 0.65) })),
        breakdown: [
          { label: "این ماه", value: Math.round(expected * 0.28) },
          { label: "ماه بعد", value: Math.round(expected * 0.35) },
          { label: "دو ماه بعد", value: Math.round(expected * 0.37) },
        ],
        columns: [
          { key: "opp", label: "فرصت" },
          { key: "expected", label: "ارزش مورد انتظار", format: "money" },
          { key: "date", label: "تاریخ احتمالی" },
          { key: "prob", label: "احتمال %", format: "percent" },
        ],
        rows: Array.from({ length: 8 }, (_, i) => ({
          opp: `فرصت ${i + 1}`,
          expected: rnd(seed, i, 20_000_000, 180_000_000),
          date: `1404/${String((i % 12) + 1).padStart(2, "0")}/15`,
          prob: rnd(seed, i + 5, 20, 90),
        })),
      };
    }
    case "agent-performance": {
      const agents = ["رضایی", "محمدی", "کریمی", "احمدی", "حسینی"];
      const rows = agents.map((name, i) => ({
        agent: name,
        sales: rnd(seed, i, 120_000_000, 650_000_000),
        target: rnd(seed, i + 3, 200_000_000, 700_000_000),
        won: rnd(seed, i + 6, 3, 28),
        lost: rnd(seed, i + 9, 1, 16),
        newCustomers: rnd(seed, i + 12, 2, 18),
        discount: rnd(seed, i + 15, 2, 18),
      }));
      return {
        ...base,
        kpis: [
          { label: "جمع فروش کارشناسان", value: rows.reduce((s, r) => s + Number(r.sales), 0), format: "money", tone: "sales" },
          { label: "میانگین تحقق", value: 86, format: "percent", tone: "profit" },
          { label: "مشتری جدید", value: rows.reduce((s, r) => s + Number(r.newCustomers), 0), format: "number" },
        ],
        series: rows.map((r) => ({ label: String(r.agent), value: Number(r.sales), value2: Number(r.target) })),
        seriesLabel: "فروش",
        seriesLabel2: "هدف",
        breakdown: rows.map((r) => ({ label: String(r.agent), value: Number(r.sales) })),
        breakdownTitle: "سهم کارشناسان",
        columns: [
          { key: "agent", label: "کارشناس" },
          { key: "sales", label: "فروش", format: "money" },
          { key: "target", label: "هدف", format: "money" },
          { key: "won", label: "موفق", format: "number" },
          { key: "lost", label: "ناموفق", format: "number" },
          { key: "newCustomers", label: "مشتری جدید", format: "number" },
          { key: "discount", label: "تخفیف %", format: "percent" },
        ],
        rows,
      };
    }
    case "overdue-followups": {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        opportunity: `فرصت ${100 + i}`,
        overdueDays: rnd(seed, i, 1, 35),
        lastContact: `1404/07/${String(10 + (i % 15)).padStart(2, "0")}`,
        nextAction: ["تماس", "ایمیل", "جلسه", "ارسال پیشنهاد"][i % 4],
        owner: ["رضایی", "محمدی", "کریمی"][i % 3],
      }));
      return {
        ...base,
        kpis: [
          { label: "پیگیری عقب‌افتاده", value: rows.length, format: "number", tone: "warn" },
          { label: "میانگین تأخیر (روز)", value: Math.round(rows.reduce((s, r) => s + Number(r.overdueDays), 0) / rows.length), format: "days" },
        ],
        series: rows.slice(0, 6).map((r) => ({ label: String(r.opportunity), value: Number(r.overdueDays) })),
        seriesLabel: "روز تأخیر",
        breakdown: [
          { label: "بدون اقدام", value: 6 },
          { label: "سررسیدگذشته", value: 4 },
        ],
        columns: [
          { key: "opportunity", label: "فرصت" },
          { key: "overdueDays", label: "تأخیر (روز)", format: "number" },
          { key: "lastContact", label: "آخرین ارتباط" },
          { key: "nextAction", label: "اقدام بعدی" },
          { key: "owner", label: "مسئول" },
        ],
        rows,
        alerts: ["۴ فرصت بیش از ۲۰ روز بدون پیگیری هستند."],
      };
    }
    case "win-loss": {
      const won = rnd(seed, 1, 20, 60);
      const lost = rnd(seed, 2, 10, 40);
      const lostValue = rnd(seed, 3, 200_000_000, 900_000_000);
      const reasons = ["قیمت", "رقیب", "زمان‌بندی", "نیاز تغییر کرد", "سایر"];
      return {
        ...base,
        kpis: [
          { label: "نرخ موفقیت", value: Math.round((won / (won + lost)) * 1000) / 10, format: "percent", tone: "profit" },
          { label: "فرصت موفق", value: won, format: "number", tone: "sales" },
          { label: "فرصت ناموفق", value: lost, format: "number", tone: "warn" },
          { label: "ارزش ازدست‌رفته", value: lostValue, format: "money", tone: "buy" },
        ],
        series: reasons.map((label, i) => ({ label, value: rnd(seed, i + 4, 30_000_000, 250_000_000) })),
        seriesLabel: "ارزش شکست",
        breakdown: [
          { label: "موفق", value: won },
          { label: "ناموفق", value: lost },
        ],
        breakdownTitle: "سهم نتیجه",
        columns: [
          { key: "reason", label: "دلیل شکست" },
          { key: "count", label: "تعداد", format: "number" },
          { key: "value", label: "ارزش", format: "money" },
        ],
        rows: reasons.map((reason, i) => ({
          reason,
          count: rnd(seed, i + 8, 1, 14),
          value: rnd(seed, i + 12, 30_000_000, 250_000_000),
        })),
      };
    }
    case "quote-to-sale": {
      const rows = Array.from({ length: 8 }, (_, i) => ({
        quote: `PF-${1400 + i}`,
        quoteAmount: rnd(seed, i, 40_000_000, 300_000_000),
        invoiceAmount: i % 3 === 0 ? rnd(seed, i + 2, 20_000_000, 280_000_000) : 0,
        days: rnd(seed, i + 4, 2, 45),
        status: i % 3 === 0 ? "منجر به فروش" : i % 3 === 1 ? "در پیگیری" : "منقضی",
      }));
      return {
        ...base,
        kpis: [
          { label: "پیش‌فاکتور باز", value: rows.filter((r) => r.status !== "منجر به فروش").length, format: "number" },
          { label: "نرخ تبدیل", value: 33, format: "percent", tone: "profit" },
        ],
        series: rows.map((r) => ({ label: String(r.quote), value: Number(r.quoteAmount), value2: Number(r.invoiceAmount) })),
        seriesLabel: "پیش‌فاکتور",
        seriesLabel2: "فاکتور",
        columns: [
          { key: "quote", label: "پیش‌فاکتور" },
          { key: "quoteAmount", label: "مبلغ پیش‌فاکتور", format: "money" },
          { key: "invoiceAmount", label: "مبلغ فاکتور", format: "money" },
          { key: "days", label: "فاصله روز", format: "number" },
          { key: "status", label: "وضعیت" },
        ],
        rows,
      };
    }
    case "sales-cycle": {
      const stages = ["سرنخ", "صلاحیت", "پیشنهاد", "مذاکره", "بستن"];
      return {
        ...base,
        kpis: [
          { label: "میانگین چرخه (روز)", value: rnd(seed, 1, 18, 55), format: "days", tone: "sales" },
          { label: "میانه چرخه (روز)", value: rnd(seed, 2, 14, 40), format: "days" },
        ],
        series: stages.map((label, i) => ({ label, value: rnd(seed, i, 2, 18) })),
        seriesLabel: "روز توقف",
        breakdown: stages.map((label, i) => ({ label, value: rnd(seed, i + 5, 2, 18) })),
        breakdownTitle: "توقف در مراحل",
        columns: [
          { key: "stage", label: "مرحله" },
          { key: "avgDays", label: "میانگین روز", format: "number" },
          { key: "maxDays", label: "حداکثر روز", format: "number" },
        ],
        rows: stages.map((stage, i) => ({
          stage,
          avgDays: rnd(seed, i, 2, 18),
          maxDays: rnd(seed, i + 10, 10, 40),
        })),
      };
    }
    case "customers-lifecycle": {
      const neu = rnd(seed, 1, 20, 80);
      const active = rnd(seed, 2, 80, 220);
      const lost = rnd(seed, 3, 10, 40);
      return {
        ...base,
        kpis: [
          { label: "مشتری جدید", value: neu, format: "number", tone: "sales" },
          { label: "مشتری فعال", value: active, format: "number", tone: "profit" },
          { label: "ازدست‌رفته", value: lost, format: "number", tone: "warn" },
          { label: "نرخ خرید تکراری", value: 41, format: "percent" },
        ],
        series: [
          { label: "جدید", value: neu },
          { label: "فعال", value: active },
          { label: "ازدست‌رفته", value: lost },
        ],
        breakdown: [
          { label: "جدید", value: neu },
          { label: "فعال", value: active },
          { label: "ازدست‌رفته", value: lost },
        ],
        columns: [
          { key: "customer", label: "مشتری" },
          { key: "group", label: "گروه" },
          { key: "lastBuy", label: "آخرین خرید" },
          { key: "value", label: "ارزش خرید", format: "money" },
          { key: "repeat", label: "تکراری" },
        ],
        rows: Array.from({ length: 10 }, (_, i) => ({
          customer: `مشتری ${i + 1}`,
          group: ["جدید", "فعال", "ازدست‌رفته"][i % 3],
          lastBuy: `1404/0${(i % 6) + 1}/12`,
          value: rnd(seed, i, 15_000_000, 220_000_000),
          repeat: i % 2 === 0 ? "بله" : "خیر",
        })),
      };
    }
    case "sales-mix": {
      const cats = ["الکترونیک", "مواد غذایی", "پوشاک", "لوازم خانگی", "سایر"];
      return {
        ...base,
        kpis: [
          { label: "نرخ تخفیف میانگین", value: 8.6, format: "percent", tone: "warn" },
          { label: "مرجوعی", value: rnd(seed, 9, 20_000_000, 90_000_000), format: "money", tone: "buy" },
        ],
        series: cats.map((label, i) => ({
          label,
          value: rnd(seed, i, 80_000_000, 400_000_000),
          value2: rnd(seed, i + 5, 5_000_000, 40_000_000),
        })),
        seriesLabel: "فروش",
        seriesLabel2: "تخفیف",
        breakdown: cats.map((label, i) => ({ label, value: rnd(seed, i, 80_000_000, 400_000_000) })),
        breakdownTitle: "سهم گروه کالا",
        columns: [
          { key: "category", label: "گروه/محصول" },
          { key: "sales", label: "فروش", format: "money" },
          { key: "discount", label: "تخفیف", format: "money" },
          { key: "return", label: "مرجوعی", format: "money" },
          { key: "share", label: "سهم %", format: "percent" },
        ],
        rows: cats.map((category, i) => ({
          category,
          sales: rnd(seed, i, 80_000_000, 400_000_000),
          discount: rnd(seed, i + 5, 5_000_000, 40_000_000),
          return: rnd(seed, i + 8, 2_000_000, 25_000_000),
          share: rnd(seed, i + 11, 8, 35),
        })),
      };
    }
    case "receivables-collection": {
      const rows = Array.from({ length: 8 }, (_, i) => ({
        customer: `مشتری ${i + 1}`,
        balance: rnd(seed, i, 30_000_000, 280_000_000),
        overdue: rnd(seed, i + 3, 0, 180_000_000),
        collected: rnd(seed, i + 6, 10_000_000, 150_000_000),
        owner: ["حسابداری", "فروش", "وصول"][i % 3],
      }));
      return {
        ...base,
        kpis: [
          { label: "مانده مطالبات", value: rows.reduce((s, r) => s + Number(r.balance), 0), format: "money", tone: "warn" },
          { label: "سررسیدشده", value: rows.reduce((s, r) => s + Number(r.overdue), 0), format: "money", tone: "buy" },
          { label: "وصول‌شده دوره", value: rows.reduce((s, r) => s + Number(r.collected), 0), format: "money", tone: "profit" },
        ],
        series: rows.map((r) => ({ label: String(r.customer), value: Number(r.balance), value2: Number(r.overdue) })),
        seriesLabel: "مانده",
        seriesLabel2: "سررسیدشده",
        columns: [
          { key: "customer", label: "مشتری" },
          { key: "balance", label: "مانده", format: "money" },
          { key: "overdue", label: "سررسیدشده", format: "money" },
          { key: "collected", label: "وصول‌شده", format: "money" },
          { key: "owner", label: "مسئول" },
        ],
        rows,
        alerts: ["۳ مشتری مطالبات سررسیدشده بالای ۵۰ میلیون دارند."],
      };
    }

    // Finance
    case "pnl-summary": {
      const income = series.reduce((s, p) => s + p.value, 0);
      const expense = series.reduce((s, p) => s + (p.value2 || 0), 0);
      return {
        ...base,
        kpis: [
          { label: "درآمد", value: income, format: "money", tone: "sales" },
          { label: "هزینه", value: expense, format: "money", tone: "buy" },
          { label: "سود خالص", value: income - expense, format: "money", tone: "profit" },
        ],
        seriesLabel: "درآمد",
        seriesLabel2: "هزینه",
        seriesLabel3: "سود",
        series: series.map((p) => ({
          label: p.label,
          value: p.value,
          value2: p.value2,
          value3: p.value - (p.value2 || 0),
        })),
        breakdown: [
          { label: "عملیاتی", value: Math.round((income - expense) * 0.7) },
          { label: "غیرعملیاتی", value: Math.round((income - expense) * 0.3) },
        ],
        columns: [
          { key: "month", label: "ماه" },
          { key: "income", label: "درآمد", format: "money" },
          { key: "expense", label: "هزینه", format: "money" },
          { key: "profit", label: "سود", format: "money" },
        ],
        rows: series.map((p) => ({
          month: p.label,
          income: p.value,
          expense: p.value2 || 0,
          profit: p.value - (p.value2 || 0),
        })),
      };
    }
    case "cash-bank": {
      const cash = rnd(seed, 1, 80_000_000, 250_000_000);
      const banks = [
        { bank: "ملی", balance: rnd(seed, 2, 100_000_000, 500_000_000) },
        { bank: "ملت", balance: rnd(seed, 3, 80_000_000, 400_000_000) },
        { bank: "تجارت", balance: rnd(seed, 4, 50_000_000, 300_000_000) },
      ];
      const bankSum = banks.reduce((s, b) => s + b.balance, 0);
      return {
        ...base,
        kpis: [
          { label: "نقد", value: cash, format: "money", tone: "sales" },
          { label: "بانک", value: bankSum, format: "money", tone: "profit" },
          { label: "جمع نقد و بانک", value: cash + bankSum, format: "money", tone: "stock" },
        ],
        series: banks.map((b) => ({ label: b.bank, value: b.balance })),
        breakdown: [{ label: "نقد", value: cash }, ...banks.map((b) => ({ label: b.bank, value: b.balance }))],
        columns: [
          { key: "account", label: "حساب" },
          { key: "balance", label: "مانده", format: "money" },
        ],
        rows: [{ account: "صندوق", balance: cash }, ...banks.map((b) => ({ account: `بانک ${b.bank}`, balance: b.balance }))],
      };
    }
    case "ar-ap": {
      const ar = rnd(seed, 1, 300_000_000, 900_000_000);
      const ap = rnd(seed, 2, 200_000_000, 700_000_000);
      return {
        ...base,
        kpis: [
          { label: "مطالبات مشتریان", value: ar, format: "money", tone: "sales" },
          { label: "بدهی تأمین‌کنندگان", value: ap, format: "money", tone: "buy" },
          { label: "خالص", value: ar - ap, format: "money", tone: "profit" },
        ],
        series: MONTH_LABELS.slice(0, 6).map((label, i) => ({
          label,
          value: rnd(seed, i, 40_000_000, 120_000_000),
          value2: rnd(seed, i + 8, 30_000_000, 100_000_000),
        })),
        seriesLabel: "مطالبات",
        seriesLabel2: "بدهی",
        breakdown: [
          { label: "مطالبات", value: ar },
          { label: "بدهی", value: ap },
        ],
        columns: [
          { key: "party", label: "طرف حساب" },
          { key: "type", label: "نوع" },
          { key: "amount", label: "مبلغ", format: "money" },
        ],
        rows: [
          { party: "مشتری الف", type: "مطالبات", amount: Math.round(ar * 0.3) },
          { party: "مشتری ب", type: "مطالبات", amount: Math.round(ar * 0.25) },
          { party: "تأمین‌کننده ۱", type: "بدهی", amount: Math.round(ap * 0.4) },
          { party: "تأمین‌کننده ۲", type: "بدهی", amount: Math.round(ap * 0.35) },
        ],
      };
    }
    case "budget-vs-actual": {
      return {
        ...base,
        kpis: [
          { label: "بودجه ماه", value: rnd(seed, 1, 400_000_000, 700_000_000), format: "money" },
          { label: "واقعی ماه", value: rnd(seed, 2, 350_000_000, 680_000_000), format: "money", tone: "sales" },
          { label: "انحراف %", value: -6.2, format: "percent", tone: "warn" },
        ],
        series: series.map((p) => ({
          label: p.label,
          value: p.value,
          value2: Math.round(p.value * 1.08),
          value3: p.value2,
        })),
        seriesLabel: "واقعی",
        seriesLabel2: "بودجه",
        seriesLabel3: "ماه قبل",
        columns: [
          { key: "month", label: "ماه" },
          { key: "actual", label: "واقعی", format: "money" },
          { key: "budget", label: "بودجه", format: "money" },
          { key: "prev", label: "ماه قبل", format: "money" },
          { key: "var", label: "انحراف %", format: "percent" },
        ],
        rows: series.map((p) => ({
          month: p.label,
          actual: p.value,
          budget: Math.round(p.value * 1.08),
          prev: p.value2 || 0,
          var: rnd(seed, 3, -12, 15),
        })),
      };
    }
    case "income-expense-analysis": {
      return {
        ...base,
        kpis: [
          { label: "نسبت هزینه به درآمد", value: 68, format: "percent", tone: "warn" },
          { label: "رشد درآمد", value: 9.5, format: "percent", tone: "profit" },
        ],
        seriesLabel: "درآمد",
        seriesLabel2: "هزینه",
        columns: [
          { key: "item", label: "سرفصل" },
          { key: "amount", label: "مبلغ", format: "money" },
          { key: "share", label: "سهم %", format: "percent" },
        ],
        rows: [
          { item: "فروش کالا", amount: rnd(seed, 1, 400_000_000, 800_000_000), share: 72 },
          { item: "خدمات", amount: rnd(seed, 2, 80_000_000, 200_000_000), share: 18 },
          { item: "سایر درآمد", amount: rnd(seed, 3, 20_000_000, 80_000_000), share: 10 },
          { item: "بهای تمام‌شده", amount: rnd(seed, 4, 200_000_000, 450_000_000), share: 45 },
          { item: "هزینه عملیاتی", amount: rnd(seed, 5, 80_000_000, 200_000_000), share: 22 },
        ],
        breakdown: [
          { label: "درآمد", value: rnd(seed, 6, 500_000_000, 900_000_000) },
          { label: "هزینه", value: rnd(seed, 7, 300_000_000, 600_000_000) },
        ],
      };
    }
    case "revenue-breakdown": {
      const dims = [
        { label: "محصول A", value: rnd(seed, 1, 100_000_000, 300_000_000) },
        { label: "محصول B", value: rnd(seed, 2, 80_000_000, 250_000_000) },
        { label: "منطقه تهران", value: rnd(seed, 3, 120_000_000, 350_000_000) },
        { label: "منطقه اصفهان", value: rnd(seed, 4, 60_000_000, 180_000_000) },
      ];
      return {
        ...base,
        kpis: [
          { label: "جمع درآمد تفکیکی", value: dims.reduce((s, d) => s + d.value, 0), format: "money", tone: "sales" },
        ],
        series: dims,
        breakdown: dims,
        breakdownTitle: "ابعاد درآمد",
        columns: [
          { key: "dim", label: "بُعد" },
          { key: "name", label: "عنوان" },
          { key: "amount", label: "مبلغ", format: "money" },
          { key: "seller", label: "فروشنده" },
        ],
        rows: [
          { dim: "محصول", name: "محصول A", amount: dims[0].value, seller: "رضایی" },
          { dim: "محصول", name: "محصول B", amount: dims[1].value, seller: "محمدی" },
          { dim: "منطقه", name: "تهران", amount: dims[2].value, seller: "کریمی" },
          { dim: "منطقه", name: "اصفهان", amount: dims[3].value, seller: "احمدی" },
          { dim: "مشتری", name: "مشتری ویژه ۱", amount: rnd(seed, 8, 50_000_000, 150_000_000), seller: "رضایی" },
        ],
      };
    }
    case "expense-by-unit": {
      const units = ["فروش", "مالی", "انبار", "اداری", "پشتیبانی"];
      const rows = units.map((unit, i) => ({
        unit,
        amount: rnd(seed, i, 40_000_000, 180_000_000),
        share: rnd(seed, i + 5, 8, 30),
      }));
      return {
        ...base,
        kpis: [
          { label: "جمع هزینه واحدها", value: rows.reduce((s, r) => s + Number(r.amount), 0), format: "money", tone: "buy" },
        ],
        series: rows.map((r) => ({ label: String(r.unit), value: Number(r.amount) })),
        breakdown: rows.map((r) => ({ label: String(r.unit), value: Number(r.amount) })),
        columns: [
          { key: "unit", label: "واحد" },
          { key: "amount", label: "هزینه", format: "money" },
          { key: "share", label: "سهم %", format: "percent" },
        ],
        rows,
      };
    }
    case "cashflow-commitments":
    case "cash-in-out": {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        date: `1404/07/${String(i + 1).padStart(2, "0")}`,
        desc: i % 2 === 0 ? "وصول مشتری" : "پرداخت تأمین‌کننده",
        amount: rnd(seed, i, 10_000_000, 90_000_000),
        type: i % 2 === 0 ? "ورودی" : "خروجی",
      }));
      const inflow = rows.filter((r) => r.type === "ورودی").reduce((s, r) => s + r.amount, 0);
      const outflow = rows.filter((r) => r.type === "خروجی").reduce((s, r) => s + r.amount, 0);
      return {
        ...base,
        kpis: [
          { label: "ورودی", value: inflow, format: "money", tone: "sales" },
          { label: "خروجی", value: outflow, format: "money", tone: "buy" },
          { label: "خالص", value: inflow - outflow, format: "money", tone: "profit" },
          { label: "تعهدات آتی", value: rnd(seed, 99, 100_000_000, 400_000_000), format: "money", tone: "warn" },
        ],
        series: MONTH_LABELS.slice(0, 6).map((label, i) => ({
          label,
          value: rnd(seed, i, 50_000_000, 150_000_000),
          value2: rnd(seed, i + 6, 40_000_000, 130_000_000),
        })),
        seriesLabel: "ورودی",
        seriesLabel2: "خروجی",
        columns: [
          { key: "date", label: "تاریخ" },
          { key: "desc", label: "شرح" },
          { key: "amount", label: "مبلغ", format: "money" },
          { key: "type", label: "نوع" },
        ],
        rows,
      };
    }
    case "cash-forecast": {
      const weeks = ["هفته ۱", "هفته ۲", "هفته ۳", "هفته ۴", "ماه بعد", "دو ماه بعد"];
      return {
        ...base,
        kpis: [
          { label: "پیش‌بینی پایان ماه", value: rnd(seed, 1, 200_000_000, 500_000_000), format: "money", tone: "profit" },
        ],
        series: weeks.map((label, i) => ({
          label,
          value: rnd(seed, i, 150_000_000, 450_000_000),
          value2: rnd(seed, i + 4, 80_000_000, 200_000_000),
        })),
        seriesLabel: "موجودی پیش‌بینی",
        seriesLabel2: "وصولی مورد انتظار",
        columns: [
          { key: "period", label: "دوره" },
          { key: "forecast", label: "پیش‌بینی نقد", format: "money" },
          { key: "collect", label: "وصولی", format: "money" },
          { key: "notes", label: "اسناد دریافتنی", format: "money" },
        ],
        rows: weeks.map((period, i) => ({
          period,
          forecast: rnd(seed, i, 150_000_000, 450_000_000),
          collect: rnd(seed, i + 4, 80_000_000, 200_000_000),
          notes: rnd(seed, i + 8, 40_000_000, 150_000_000),
        })),
      };
    }
    case "overdue-ar-stale": {
      const rows = Array.from({ length: 8 }, (_, i) => ({
        customer: `مشتری ${i + 1}`,
        amount: rnd(seed, i, 20_000_000, 160_000_000),
        due: `1404/0${(i % 6) + 1}/20`,
        stale: i % 3 === 0 ? "بله" : "خیر",
      }));
      return {
        ...base,
        kpis: [
          { label: "مطالبات سررسیدشده", value: rows.reduce((s, r) => s + Number(r.amount), 0), format: "money", tone: "warn" },
          { label: "اقلام راکد", value: rows.filter((r) => r.stale === "بله").length, format: "number", tone: "buy" },
        ],
        series: rows.map((r) => ({ label: String(r.customer), value: Number(r.amount) })),
        columns: [
          { key: "customer", label: "مشتری" },
          { key: "amount", label: "مبلغ", format: "money" },
          { key: "due", label: "سررسید" },
          { key: "stale", label: "راکد" },
        ],
        rows,
        alerts: ["اقلام راکد نیاز به تصمیم مدیریتی دارند."],
      };
    }
    case "debt-alarms": {
      const rows = Array.from({ length: 7 }, (_, i) => ({
        vendor: `تأمین‌کننده ${i + 1}`,
        amount: rnd(seed, i, 25_000_000, 200_000_000),
        due: `1404/08/${String(i + 5).padStart(2, "0")}`,
        status: i < 3 ? "سررسیدشده" : i < 5 ? "نزدیک" : "آتی",
      }));
      return {
        ...base,
        kpis: [
          { label: "بدهی سررسیدشده", value: rows.filter((r) => r.status === "سررسیدشده").reduce((s, r) => s + Number(r.amount), 0), format: "money", tone: "warn" },
          { label: "آلارم نزدیک", value: rows.filter((r) => r.status === "نزدیک").length, format: "number", tone: "buy" },
        ],
        series: rows.map((r) => ({ label: String(r.vendor), value: Number(r.amount) })),
        columns: [
          { key: "vendor", label: "تأمین‌کننده" },
          { key: "amount", label: "مبلغ", format: "money" },
          { key: "due", label: "سررسید" },
          { key: "status", label: "وضعیت" },
        ],
        rows,
        alerts: ["۳ بدهی سررسیدشده نیاز به پرداخت فوری دارند."],
      };
    }
    case "pnl-periods": {
      const periods = ["هفته جاری", "ماه جاری", "فصل", "سال"];
      return {
        ...base,
        kpis: [
          { label: "سود ماه", value: rnd(seed, 1, 80_000_000, 250_000_000), format: "money", tone: "profit" },
          { label: "سود سال", value: rnd(seed, 2, 800_000_000, 2_000_000_000), format: "money", tone: "sales" },
        ],
        series: periods.map((label, i) => ({
          label,
          value: rnd(seed, i, 100_000_000, 900_000_000),
          value2: rnd(seed, i + 4, 60_000_000, 600_000_000),
          value3: rnd(seed, i + 8, 20_000_000, 300_000_000),
        })),
        seriesLabel: "درآمد",
        seriesLabel2: "هزینه",
        seriesLabel3: "سود",
        columns: [
          { key: "period", label: "دوره" },
          { key: "income", label: "درآمد", format: "money" },
          { key: "expense", label: "هزینه", format: "money" },
          { key: "profit", label: "سود", format: "money" },
        ],
        rows: periods.map((period, i) => ({
          period,
          income: rnd(seed, i, 100_000_000, 900_000_000),
          expense: rnd(seed, i + 4, 60_000_000, 600_000_000),
          profit: rnd(seed, i + 8, 20_000_000, 300_000_000),
        })),
      };
    }
    case "financial-ratios": {
      const ratios = [
        { name: "نسبت جاری", value: 1.45, benchmark: 1.5 },
        { name: "نسبت آنی", value: 0.92, benchmark: 1.0 },
        { name: "حاشیه سود ناخالص %", value: 28.5, benchmark: 30 },
        { name: "حاشیه سود خالص %", value: 11.2, benchmark: 12 },
        { name: "گردش مطالبات (روز)", value: 48, benchmark: 45 },
        { name: "گردش موجودی (روز)", value: 62, benchmark: 60 },
      ];
      return {
        ...base,
        kpis: ratios.slice(0, 4).map((r) => ({
          label: r.name,
          value: r.value,
          format: r.name.includes("%") || r.name.includes("حاشیه") ? "percent" : r.name.includes("روز") ? "days" : "number",
          tone: "profit" as const,
        })),
        series: ratios.map((r) => ({ label: r.name, value: r.value, value2: r.benchmark })),
        seriesLabel: "مقدار",
        seriesLabel2: "معیار",
        columns: [
          { key: "name", label: "نسبت" },
          { key: "value", label: "مقدار", format: "number" },
          { key: "benchmark", label: "معیار", format: "number" },
          { key: "status", label: "وضعیت" },
        ],
        rows: ratios.map((r) => ({
          name: r.name,
          value: r.value,
          benchmark: r.benchmark,
          status: r.value >= r.benchmark ? "مطلوب" : "نیاز به بهبود",
        })),
        alerts: ["گردش مطالبات کمی بالاتر از معیار است."],
      };
    }
    default:
      return base;
  }
}
