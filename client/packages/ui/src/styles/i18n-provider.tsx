// I18n context — provides language switching to all UI components
// Supports pluggable storage: chrome.storage, localStorage, or custom adapter

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { StorageAdapter } from './theme-provider';

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

/** Check if chrome.storage.local is available (extension environment) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getChromeStorage(): { get: (key: string) => Promise<Record<string, any>>; set: (obj: Record<string, any>) => Promise<void> } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.chrome !== 'undefined' && g.chrome.storage?.local) return g.chrome.storage.local;
  return null;
}

/** Default storage adapter — uses chrome.storage.local if available, else localStorage */
const defaultAdapter: StorageAdapter = {
  async get(key) {
    const cs = getChromeStorage();
    if (cs) {
      const r = await cs.get(key);
      return r[key] ?? null;
    }
    return localStorage.getItem(key);
  },
  async set(key, value) {
    const cs = getChromeStorage();
    if (cs) {
      await cs.set({ [key]: value });
    } else {
      localStorage.setItem(key, value);
    }
  },
};

interface I18nProviderProps {
  children: React.ReactNode;
  /** Called when language changes — parent should call i18n.changeLanguage() */
  onLanguageChange?: (lang: Language) => void;
  /** Optional storage adapter — defaults to chrome.storage.local or localStorage */
  storageAdapter?: StorageAdapter;
}

export function I18nProvider({ children, onLanguageChange, storageAdapter }: I18nProviderProps) {
  const adapter = storageAdapter || defaultAdapter;
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved preference on mount
  useEffect(() => {
    adapter.get(STORAGE_KEY).then((val) => {
      if (val && (val === 'en' || val === 'vi')) {
        setLanguageState(val as Language);
        onLanguageChange?.(val as Language);
      }
    });
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    onLanguageChange?.(newLang);
    adapter.set(STORAGE_KEY, newLang);
  }, [onLanguageChange, adapter]);

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
