import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";

const sans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
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
        <I18nProvider locale={locale}>
          <TooltipProvider delay={200}>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
