// Theme context — provides light/dark color switching to all UI components
// Supports pluggable storage: chrome.storage, localStorage, or custom adapter

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { lightColors, darkColors, type ThemeColors } from './design-tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Platform-agnostic storage adapter for persisting preferences */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolved: 'light',
  colors: lightColors,
  setMode: () => {},
});

/** Detect system dark mode preference */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

const STORAGE_KEY = 'vaultic_theme';

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

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optional storage adapter — defaults to chrome.storage.local or localStorage */
  storageAdapter?: StorageAdapter;
}

export function ThemeProvider({ children, storageAdapter }: ThemeProviderProps) {
  const adapter = storageAdapter || defaultAdapter;
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Load saved preference on mount
  useEffect(() => {
    adapter.get(STORAGE_KEY).then((val) => {
      if (val) setModeState(val as ThemeMode);
    });
  }, []);

  // Listen to system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    adapter.set(STORAGE_KEY, newMode);
  };

  const resolved = mode === 'system' ? systemTheme : mode;
  const colors = resolved === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, resolved, colors, setMode }),
    [mode, resolved, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Get current theme colors + mode. Use in any component that needs theme-aware colors. */
export function useTheme() {
  return useContext(ThemeContext);
}
