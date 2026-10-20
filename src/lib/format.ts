const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => faDigits[Number(d)]);
}

export function formatMoney(value: number, withCurrency = true): string {
  const formatted = new Intl.NumberFormat("fa-IR").format(Math.round(value));
  return withCurrency ? `${formatted} ریال` : formatted;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${toFaDigits((value / 1_000_000_000).toFixed(1))} میلیارد`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${toFaDigits((value / 1_000_000).toFixed(1))} میلیون`;
  }
  return formatNumber(value);
}

export const MONTH_LABELS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
