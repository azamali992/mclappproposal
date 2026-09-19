// ─── Language ────────────────────────────────────────────────────────────────
// English / Urdu, with the English source string as the lookup key. Retrofitting
// a key scheme onto thirty screens costs more than it returns, and a missing
// Urdu entry then degrades to readable English rather than to `nav.home.title`.
//
// Adding translations: put them in the dictionary for your app area —
// `ur.client.ts`, `ur.driver.ts`, `ur.backoffice.ts`, `ur.common.ts`. One file
// per area so several people can work at once without colliding.

import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { urCommon } from './ur.common';
import { urClient } from './ur.client';
import { urDriver } from './ur.driver';
import { urBackoffice } from './ur.backoffice';

export type Lang = 'en' | 'ur';
export type Dict = Record<string, string>;

const UR: Dict = { ...urCommon, ...urBackoffice, ...urDriver, ...urClient };

/** Translate. `t('Hello {name}', { name })` interpolates. */
export type TFn = (en: string, vars?: Record<string, string | number>) => string;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
  dir: 'ltr' | 'rtl';
  isUrdu: boolean;
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = 'mcl.lang';

/** Strings asked for but not translated — surfaced for a coverage check. */
export const missingUrdu = new Set<string>();

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const saved = window.localStorage?.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ur') return saved;
    } catch {
      /* private mode — fall through to the default */
    }
    return 'en';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage?.setItem(STORAGE_KEY, l);
    } catch {
      /* not worth failing a language switch over */
    }
  };

  const dir: 'ltr' | 'rtl' = lang === 'ur' ? 'rtl' : 'ltr';

  // Nastaliq needs the document to know, so the font stack and the base
  // line-height in index.css can key off [lang="ur"].
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo<I18nCtx>(() => {
    const t: TFn = (en, vars) => {
      if (lang === 'en') return interpolate(en, vars);
      const hit = UR[en];
      if (!hit) {
        missingUrdu.add(en);
        return interpolate(en, vars); // graceful: English beats a broken key
      }
      return interpolate(hit, vars);
    };
    return { lang, setLang, t, dir, isUrdu: lang === 'ur' };
  }, [lang, dir]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The whole context — language, setter, direction. */
export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) {
    // Rendering outside the provider is a programming error, but a demo should
    // degrade rather than white-screen.
    return {
      lang: 'en',
      setLang: () => {},
      t: (en, vars) => interpolate(en, vars),
      dir: 'ltr',
      isUrdu: false,
    };
  }
  return c;
}

/** The common case: `const t = useT();  t('Place order')`. */
export function useT(): TFn {
  return useI18n().t;
}

/** Coverage helper for the console: `mclI18n.report()`. */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).mclI18n = {
    report: () => ({
      translated: Object.keys(UR).length,
      missing: [...missingUrdu].sort(),
    }),
  };
}
