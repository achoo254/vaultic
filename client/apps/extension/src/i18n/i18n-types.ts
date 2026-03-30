// Type-safe i18n — re-exports for consuming components

import type enCommon from '../locales/en/common.json';
import type enAuth from '../locales/en/auth.json';
import type enVault from '../locales/en/vault.json';
import type enSettings from '../locales/en/settings.json';
import type enShare from '../locales/en/share.json';

// Namespace resource map for TypeScript augmentation
export interface I18nResources {
  common: typeof enCommon;
  auth: typeof enAuth;
  vault: typeof enVault;
  settings: typeof enSettings;
  share: typeof enShare;
}

// Augment i18next to enable type-safe t() calls
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: I18nResources;
  }
}
