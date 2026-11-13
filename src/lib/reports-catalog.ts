export type ReportGroup = "sales" | "finance";
export type DataMode = "live" | "mock" | "hybrid";

export type ReportDef = {
  id: string;
  group: ReportGroup;
  priority: number;
  title: string;
  summary: string;
  fields: string[];
  dataMode: DataMode;
};

export const SALES_REPORTS: ReportDef[] = [
  {
    id: "actual-vs-target",
    group: "sales",
    priority: 1,
    title: "فروش واقعی و تحقق هدف",
    summary: "فروش خالص، هدف ماهانه، درصد تحقق، فاصله تا هدف و رشد نسبت به دوره مشابه",
    fields: ["فروش خالص", "هدف ماهانه", "درصد تحقق", "فاصله تا هدف", "رشد دوره مشابه"],
    dataMode: "hybrid",
  },
  {
    id: "pipeline-funnel",
    group: "sales",
    priority: 2,
    title: "وضعیت فرصت‌ها و قیف فروش",
    summary: "تعداد و مبلغ فرصت‌های باز، مرحله فروش، مسئول فرصت و فرصت‌های متوقف‌شده",
    fields: ["فرصت باز", "مبلغ", "مرحله", "مسئول", "متوقف‌شده"],
    dataMode: "mock",
  },
  {
    id: "sales-forecast",
    group: "sales",
    priority: 3,
    title: "پیش‌بینی فروش",
    summary: "ارزش مورد انتظار فرصت‌ها، تاریخ احتمالی نهایی‌شدن و فاصله فروش پیش‌بینی‌شده تا هدف",
    fields: ["ارزش مورد انتظار", "تاریخ احتمالی", "فاصله تا هدف"],
    dataMode: "mock",
  },
  {
    id: "agent-performance",
    group: "sales",
    priority: 4,
    title: "عملکرد کارشناسان فروش",
    summary: "فروش خالص، تحقق هدف، فرصت موفق/ناموفق، مشتری جدید و تخفیف هر کارشناس",
    fields: ["کارشناس", "فروش", "تحقق", "موفق", "ناموفق", "مشتری جدید", "تخفیف"],
    dataMode: "mock",
  },
  {
    id: "overdue-followups",
    group: "sales",
    priority: 5,
    title: "پیگیری‌های عقب‌افتاده و فرصت‌های بدون اقدام",
    summary: "پیگیری سررسیدگذشته، آخرین ارتباط، اقدام بعدی و مسئول پیگیری",
    fields: ["سررسیدگذشته", "آخرین ارتباط", "اقدام بعدی", "مسئول"],
    dataMode: "mock",
  },
  {
    id: "win-loss",
    group: "sales",
    priority: 6,
    title: "نرخ موفقیت و دلایل شکست فرصت‌ها",
    summary: "سهم فرصت‌های موفق و ناموفق، ارزش فروش ازدست‌رفته و دلایل شکست",
    fields: ["موفق", "ناموفق", "ارزش ازدست‌رفته", "دلیل شکست"],
    dataMode: "mock",
  },
  {
    id: "quote-to-sale",
    group: "sales",
    priority: 7,
    title: "پیش‌فاکتورهای منجرنشده به فروش",
    summary: "مبلغ پیش‌فاکتور، مبلغ فاکتور مرتبط، فاصله زمانی و وضعیت پیگیری",
    fields: ["پیش‌فاکتور", "فاکتور", "فاصله زمانی", "وضعیت"],
    dataMode: "mock",
  },
  {
    id: "sales-cycle",
    group: "sales",
    priority: 8,
    title: "مدت چرخه فروش",
    summary: "زمان ایجاد تا بسته‌شدن فرصت و مدت توقف در مراحل",
    fields: ["میانگین چرخه", "توقف در مرحله"],
    dataMode: "mock",
  },
  {
    id: "customers-lifecycle",
    group: "sales",
    priority: 9,
    title: "مشتریان جدید، فعال و ازدست‌رفته",
    summary: "تعداد مشتریان هر گروه، خرید تکراری، زمان آخرین خرید و ارزش خرید",
    fields: ["جدید", "فعال", "ازدست‌رفته", "خرید تکراری", "آخرین خرید"],
    dataMode: "mock",
  },
  {
    id: "sales-mix",
    group: "sales",
    priority: 10,
    title: "ترکیب فروش، تخفیف و مرجوعی",
    summary: "فروش به تفکیک محصول و مشتری، نرخ تخفیف، برگشت از فروش و سهم هر گروه",
    fields: ["محصول", "مشتری", "تخفیف", "مرجوعی", "سهم گروه"],
    dataMode: "hybrid",
  },
  {
    id: "receivables-collection",
    group: "sales",
    priority: 11,
    title: "مطالبات و وصول فروش",
    summary: "مانده حساب مشتری، مطالبات سررسیدشده، مبلغ وصول‌شده و مسئول پیگیری",
    fields: ["مانده", "سررسیدشده", "وصول‌شده", "مسئول"],
    dataMode: "mock",
  },
];

export const FINANCE_REPORTS: ReportDef[] = [
  {
    id: "pnl-summary",
    group: "finance",
    priority: 1,
    title: "درآمد، هزینه، سود خالص",
    summary: "خلاصه سود و زیان دوره",
    fields: ["درآمد", "هزینه", "سود خالص"],
    dataMode: "mock",
  },
  {
    id: "cash-bank",
    group: "finance",
    priority: 2,
    title: "موجودی نقد و بانک",
    summary: "موجودی نقدی و حساب‌های بانکی",
    fields: ["نقد", "بانک", "جمع"],
    dataMode: "mock",
  },
  {
    id: "ar-ap",
    group: "finance",
    priority: 3,
    title: "مطالبات مشتریان و بدهی تأمین‌کنندگان",
    summary: "حساب‌های دریافتنی و پرداختنی",
    fields: ["مطالبات", "بدهی"],
    dataMode: "mock",
  },
  {
    id: "budget-vs-actual",
    group: "finance",
    priority: 4,
    title: "مقایسه عملکرد با بودجه و ماه‌های قبل",
    summary: "ماه جاری در برابر بودجه و روند گذشته",
    fields: ["بودجه", "واقعی", "انحراف", "ماه قبل"],
    dataMode: "mock",
  },
  {
    id: "income-expense-analysis",
    group: "finance",
    priority: 5,
    title: "تحلیل درآمد و هزینه",
    summary: "روند و ترکیب درآمد/هزینه",
    fields: ["درآمد", "هزینه", "نسبت"],
    dataMode: "mock",
  },
  {
    id: "revenue-breakdown",
    group: "finance",
    priority: 6,
    title: "درآمد به تفکیک محصول، مشتری، منطقه، فروشنده",
    summary: "ابعاد فروش برای مدیریت",
    fields: ["محصول", "مشتری", "منطقه", "فروشنده"],
    dataMode: "hybrid",
  },
  {
    id: "expense-by-unit",
    group: "finance",
    priority: 7,
    title: "هزینه‌ها به تفکیک واحدها",
    summary: "سهم هزینه هر واحد سازمانی",
    fields: ["واحد", "هزینه", "سهم"],
    dataMode: "mock",
  },
  {
    id: "cashflow-commitments",
    group: "finance",
    priority: 8,
    title: "جریان نقدینگی و تعهدات",
    summary: "جریان نقد و تعهدات آتی",
    fields: ["ورودی", "خروجی", "تعهدات"],
    dataMode: "mock",
  },
  {
    id: "cash-in-out",
    group: "finance",
    priority: 9,
    title: "ورودی و خروجی نقدینگی",
    summary: "جزئیات ورود و خروج وجه",
    fields: ["تاریخ", "شرح", "مبلغ", "نوع"],
    dataMode: "mock",
  },
  {
    id: "cash-forecast",
    group: "finance",
    priority: 10,
    title: "پیش‌بینی موجودی نقد",
    summary: "پیش‌بینی هفته‌ها و ماه‌های آینده بر اساس وصولی و اسناد دریافتنی",
    fields: ["هفته/ماه", "پیش‌بینی", "وصولی", "اسناد"],
    dataMode: "mock",
  },
  {
    id: "overdue-ar-stale",
    group: "finance",
    priority: 11,
    title: "مطالبات سررسیدشده و اقلام راکد",
    summary: "فهرست مطالبات معوق و اقلام راکد",
    fields: ["مشتری", "مبلغ", "سررسید", "راکد"],
    dataMode: "mock",
  },
  {
    id: "debt-alarms",
    group: "finance",
    priority: 12,
    title: "بدهی‌های سررسیدشده و آتی (آلارم)",
    summary: "هشدار بدهی‌های سررسید و نزدیک",
    fields: ["تأمین‌کننده", "مبلغ", "سررسید", "وضعیت"],
    dataMode: "mock",
  },
  {
    id: "pnl-periods",
    group: "finance",
    priority: 13,
    title: "گزارش سود و زیان (هفتگی / ماهانه / سالانه)",
    summary: "P&L در بازه‌های مختلف",
    fields: ["دوره", "درآمد", "هزینه", "سود"],
    dataMode: "mock",
  },
  {
    id: "financial-ratios",
    group: "finance",
    priority: 14,
    title: "نسبت‌های مالی",
    summary: "نسبت‌های مالی برای مدیر مالی و تجزیه و تحلیل",
    fields: ["جاری", "آنی", "حاشیه سود", "گردش مطالبات"],
    dataMode: "mock",
  },
];

export const ALL_REPORTS: ReportDef[] = [...SALES_REPORTS, ...FINANCE_REPORTS];

export function getReport(id: string): ReportDef | undefined {
  return ALL_REPORTS.find((r) => r.id === id);
}

export function reportsByGroup(group: ReportGroup): ReportDef[] {
  return ALL_REPORTS.filter((r) => r.group === group).sort(
    (a, b) => a.priority - b.priority,
  );
}
