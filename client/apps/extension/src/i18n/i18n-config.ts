// i18next initialization — bundled resources for browser extension (no lazy loading)
// Persists language preference to chrome.storage.local under 'vaultic_language'

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enVault from '../locales/en/vault.json';
import enSettings from '../locales/en/settings.json';
import enShare from '../locales/en/share.json';

import viCommon from '../locales/vi/common.json';
import viAuth from '../locales/vi/auth.json';
import viVault from '../locales/vi/vault.json';
import viSettings from '../locales/vi/settings.json';
import viShare from '../locales/vi/share.json';

export const LANGUAGE_STORAGE_KEY = 'vaultic_language';

export const supportedLanguages = ['en', 'vi'] as const;
export type Language = (typeof supportedLanguages)[number];

export const languageLabels: Record<Language, { label: string; nativeLabel: string }> = {
  en: { label: 'English', nativeLabel: 'English' },
  vi: { label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
};

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, auth: enAuth, vault: enVault, settings: enSettings, share: enShare },
    vi: { common: viCommon, auth: viAuth, vault: viVault, settings: viSettings, share: viShare },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'vault', 'settings', 'share'],
  interpolation: { escapeValue: false },
});

export default i18n;
