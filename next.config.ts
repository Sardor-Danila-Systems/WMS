import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Плагин подключает src/i18n/request.ts: язык берётся из cookie на сервере,
// поэтому адреса страниц остаются без префикса языка.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
