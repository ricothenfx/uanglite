import { cache } from "react";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES_META,
  LOCALE_COOKIE,
  type Locale,
} from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { id } from "./dictionaries/id";
import { zh } from "./dictionaries/zh";
import { es } from "./dictionaries/es";

const dictionaries: Record<Locale, Dictionary> = { en, id, zh, es };

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value ?? "";
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export const getDictionary = cache(async (): Promise<Dictionary> =>
  dictionaries[await getLocale()],
);

export const getDateLocale = cache(async (): Promise<string> =>
  LOCALES_META[await getLocale()].bcp47,
);
