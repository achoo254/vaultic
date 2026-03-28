// Theme context — provides light/dark color switching to all UI components
// Persists preference to chrome.storage.local, defaults to system preference

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { lightColors, darkColors, type ThemeColors } from './design-tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

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

/** Resolve mode to light/dark */
function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

const STORAGE_KEY = 'vaultic_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Load saved preference on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(STORAGE_KEY).then((r) => {
        if (r[STORAGE_KEY]) setModeState(r[STORAGE_KEY] as ThemeMode);
      });
    }
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
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newMode });
    }
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
