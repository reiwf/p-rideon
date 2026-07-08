import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Marcellus, Jost, Zen_Kaku_Gothic_New } from "next/font/google";
import { asLocale } from "@/lib/i18n";
import "./globals.css";

const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// CJK fallback for the Jost-first body stack (ja/zh/ko UI text).
const zen = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "P-rideon — Car Rental in Osaka, Japan",
  description:
    "Rent a car in Osaka and explore Kansai — Kyoto, Nara, Kobe and beyond. English support, full insurance options, reserve now and pay at pickup.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = asLocale((await cookies()).get("kd-locale")?.value);
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${marcellus.variable} ${jost.variable} ${zen.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
