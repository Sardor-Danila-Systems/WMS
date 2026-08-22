import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./types";

/**
 * Конфигурация next-intl. Язык хранится в cookie, а не в адресе страницы:
 * система внутренняя, отдельные адреса вида /ru и /uz только удлинили бы ссылки.
 */
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(value) ? value : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Часовой пояс фиксируем, чтобы даты одинаково выглядели на сервере
    // и в браузере и не «прыгали» после гидратации.
    timeZone: process.env.WMS_TIMEZONE ?? "Asia/Tashkent",
  };
});
