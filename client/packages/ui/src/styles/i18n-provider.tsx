// I18n context — provides language switching to all UI components
// Persists preference to chrome.storage.local, follows ThemeProvider pattern

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type Language = 'en' | 'vi';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
});

const STORAGE_KEY = 'vaultic_language';

interface I18nProviderProps {
  children: React.ReactNode;
  /** Called when language changes — parent should call i18n.changeLanguage() */
  onLanguageChange?: (lang: Language) => void;
}

export function I18nProvider({ children, onLanguageChange }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved preference on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(STORAGE_KEY).then((r) => {
        if (r[STORAGE_KEY] && (r[STORAGE_KEY] === 'en' || r[STORAGE_KEY] === 'vi')) {
          setLanguageState(r[STORAGE_KEY] as Language);
          onLanguageChange?.(r[STORAGE_KEY] as Language);
        }
      });
    }
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    onLanguageChange?.(newLang);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newLang });
    }
  }, [onLanguageChange]);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Get current language + setter. Use in any component that needs language-aware behavior. */
export function useI18n() {
  return useContext(I18nContext);
}
