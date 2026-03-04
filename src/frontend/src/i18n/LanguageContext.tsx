import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LANGUAGES } from "./languages";
import { translations } from "./translations";

const STORAGE_KEY = "sub_premium_lang";
const DEFAULT_LANG = "en";

// ─── Detect device language ───────────────────────────────────────────────────

function detectDeviceLanguage(): string {
  const nav =
    navigator.language ||
    (navigator as { userLanguage?: string }).userLanguage ||
    DEFAULT_LANG;

  // 1. Exact match (e.g. "zh-CN")
  const exact = LANGUAGES.find((l) => l.code === nav);
  if (exact) return exact.code;

  // 2. Prefix match (e.g. "es-MX" → "es")
  const prefix = nav.split("-")[0];
  const prefixMatch = LANGUAGES.find((l) => l.code === prefix);
  if (prefixMatch) return prefixMatch.code;

  // 3. Partial match where language code starts with the prefix
  const partialMatch = LANGUAGES.find((l) => l.code.startsWith(prefix));
  if (partialMatch) return partialMatch.code;

  return DEFAULT_LANG;
}

// ─── Context types ────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLanguage: () => {},
  t: (key) => key,
  isRTL: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<string>(() => {
    // Check localStorage first
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    // Detect device language
    return detectDeviceLanguage();
  });

  const setLanguage = useCallback((code: string) => {
    if (!LANGUAGES.some((l) => l.code === code)) return;
    setLang(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  // Apply dir + lang attributes on language change
  useEffect(() => {
    const langObj = LANGUAGES.find((l) => l.code === lang);
    const isRTL = langObj?.rtl ?? false;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const isRTL = useMemo(() => {
    const langObj = LANGUAGES.find((l) => l.code === lang);
    return langObj?.rtl ?? false;
  }, [lang]);

  const t = useCallback(
    (key: string): string => {
      const langStrings = translations[lang];
      if (langStrings && key in langStrings) {
        return langStrings[key];
      }
      // Fallback to English
      const enStrings = translations[DEFAULT_LANG];
      if (enStrings && key in enStrings) {
        return enStrings[key];
      }
      return key;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLanguage, t, isRTL }),
    [lang, setLanguage, t, isRTL],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
