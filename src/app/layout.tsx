import type { Metadata } from "next";
import { Golos_Text, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "@/i18n/server";

/**
 * Golos Text спроектирован для кириллических интерфейсов: у него ровный ритм
 * и хорошо читаемые цифры, что важно для плотных складских таблиц.
 * Латиница поддерживается полностью — нужна для узбекского.
 */
const sans = Golos_Text({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gagarin Avenue WMS",
  description: "Учёт движения строительных материалов · Qurilish materiallari hisobi",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <NextIntlClientProvider>
          <TooltipProvider delay={200}>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
