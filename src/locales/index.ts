import es from "./es.json";
import en from "./en.json";
import type { Lang } from "@/types";

export type TranslationKey = keyof typeof es;
export type Translations = typeof es;

const DICTS: Record<Lang, Translations> = { es, en: en as Translations };

export function getTranslations(lang: Lang): Translations {
  return DICTS[lang] || DICTS.es;
}

export { es, en };
