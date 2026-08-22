import type messages from "./messages/ru.json";

/**
 * Русский файл сообщений задаёт форму ключей: обращение к несуществующему
 * ключу перевода становится ошибкой компиляции, а не пустой строкой на экране.
 */
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
    Locale: "ru" | "uz";
  }
}
