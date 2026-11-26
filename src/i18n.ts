// Minimal bilingual layer (audit L10N-1): English and Canadian French, chosen from the device language,
// overridable in More › Language. Strings are written as inline pairs — tr('Open', 'Ouvrir') — so every
// French string sits next to its English source and can be reviewed in place.
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'fr';
const STORE_KEY = 'helix.lang';
const subs = new Set<() => void>();

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {
    /* storage unavailable: fall back to the device language */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language ?? 'en' : 'en';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let current: Lang = detect();
const applyDocLang = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = current === 'fr' ? 'fr-CA' : 'en';
};
applyDocLang();

export const getLang = () => current;

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(STORE_KEY, l);
  } catch {
    /* preference not remembered in private mode; still applied for this session */
  }
  applyDocLang();
  subs.forEach((f) => f());
}

/** Non-React callers (data built outside components). */
export const tr = (en: string, fr: string) => (current === 'fr' ? fr : en);

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
    () => current
  );
}

/** Components: const t = useT(); t('Markets', 'Marchés') */
export function useT() {
  const l = useLang();
  return (en: string, fr: string) => (l === 'fr' ? fr : en);
}
