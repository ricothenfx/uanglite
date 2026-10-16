export const LOCALES = ["en", "id", "zh", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "uanglite-locale";

export const LOCALES_META: Record<
  Locale,
  { native: string; bcp47: string }
> = {
  en: { native: "English", bcp47: "en" },
  id: { native: "Bahasa Indonesia", bcp47: "id-ID" },
  zh: { native: "中文（简体）", bcp47: "zh-CN" },
  es: { native: "Español", bcp47: "es-ES" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
