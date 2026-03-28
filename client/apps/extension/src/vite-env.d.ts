/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ENV?: string;
  readonly VITE_SHARE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// WXT globals
declare function defineBackground(fn: () => void): void;
declare function defineContentScript(options: {
  matches: string[];
  runAt?: string;
  main: () => void;
}): void;
declare const browser: typeof chrome;
