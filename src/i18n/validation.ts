import type { LooseTranslate } from "./loose";

/**
 * Сообщения zod-схем хранятся как ключи вида `validation.quantityPositive`:
 * одна и та же схема работает и в браузере, и на сервере, а язык у пользователя
 * может быть любой. Здесь ключ превращается в текст.
 */
export function translateValidation(t: LooseTranslate, message: string): string {
  if (message.startsWith("validation.")) {
    const translated = t(message);
    // next-intl возвращает сам ключ, если перевода нет.
    if (translated !== message) return translated;
  }
  // Встроенные сообщения zod приходят на английском. Показывать их пользователю
  // склада нельзя, поэтому подменяем понятным текстом на его языке.
  if (/^Invalid|^Too |^Expected|^Required/i.test(message)) return t("errors.CONSTRAINT");
  return message;
}
