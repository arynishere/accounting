import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "مالی‌نمای یکپارچه | CRM · هلو · سپیدار",
  description:
    "داشبورد فروش، خرید و موجودی کالا با اتصال به CRM و نرم‌افزارهای حسابداری هلو و سپیدار",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazir.variable} h-full antialiased`}
    >
      <body className="min-h-full font-[family-name:var(--font-vazir)]">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
          <Sidebar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
