# Phase 1: Web App Shell — Vite + React + Router

## Priority: High
## Status: ✅ COMPLETED
## Effort: 2 days

## Overview

Create `client/apps/web/` — Vite + React SPA with react-router, responsive layout, design tokens from @vaultic/ui.

## Context Links

- Brainstorm: `plans/dattqh/reports/brainstorm-260331-2009-web-app-full-analysis.md`
- Design tokens: `client/packages/ui/src/styles/design-tokens.ts`
- Extension popup: `client/apps/extension/src/entrypoints/popup/`

## Architecture

```
client/apps/web/
├── package.json              # @vaultic/web
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx              # React root + providers
    ├── app.tsx               # Router outlet + layout
    ├── router.tsx            # Route definitions
    ├── lib/                  # Web-specific utilities (phase 2-4)
    ├── stores/               # Zustand stores (phase 3)
    └── pages/
        ├── login-page.tsx
        ├── register-page.tsx
        ├── vault-page.tsx
        ├── settings-page.tsx
        ├── share-page.tsx
        └── onboarding-page.tsx
```

## Files to Create

### 1. package.json

```json
{
  "name": "@vaultic/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vaultic/api": "workspace:*",
    "@vaultic/crypto": "workspace:*",
    "@vaultic/storage": "workspace:*",
    "@vaultic/sync": "workspace:*",
    "@vaultic/types": "workspace:*",
    "@vaultic/ui": "workspace:*",
    "@tabler/icons-react": "^3",
    "i18next": "^24",
    "react": "^19",
    "react-dom": "^19",
    "react-i18next": "^15",
    "react-router": "^7",
    "zustand": "^5"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5.7",
    "vite": "^6"
  }
}
```

### 2. vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  envPrefix: 'VITE_',
});
```

### 3. index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vaultic</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### 4. main.tsx

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ThemeProvider, I18nProvider } from '@vaultic/ui';
import { App } from './app';

// Web-specific storage adapter for ThemeProvider/I18nProvider
const webStorageAdapter = {
  get: (key: string) => Promise.resolve(localStorage.getItem(key)),
  set: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider storageAdapter={webStorageAdapter}>
        <I18nProvider storageAdapter={webStorageAdapter}>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

Note: ThemeProvider/I18nProvider need `storageAdapter` prop added in Phase 0 or here.

### 5. router.tsx

```typescript
import { Routes, Route, Navigate } from 'react-router';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { VaultPage } from './pages/vault-page';
import { SettingsPage } from './pages/settings-page';
import { OnboardingPage } from './pages/onboarding-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vault" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/vault" element={<VaultPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
```

### 6. app.tsx — responsive web layout

```typescript
import { AppRouter } from './router';

export function App() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
      <AppRouter />
    </div>
  );
}
```

Design: centered container (480px max), mobile-first. Extension is 380x520px fixed — web is fluid within 480px.

### 7. Page stubs (filled in Phase 3)

Each page file starts as minimal stub importing extension components:

```typescript
// pages/vault-page.tsx
export function VaultPage() {
  return <div>Vault — Phase 3</div>;
}
```

## Files to Modify

### pnpm-workspace.yaml — already includes `client/apps/*` ✅

### turbo.json — add web dev/build tasks if needed

### @vaultic/ui ThemeProvider + I18nProvider

Add optional `storageAdapter` prop to decouple from chrome.storage:

```typescript
// Before: hardcoded chrome.storage.local
if (typeof chrome !== 'undefined' && chrome.storage?.local) { ... }

// After: accept adapter, fallback to localStorage
interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

// Props: storageAdapter?: StorageAdapter
// Default: localStorage adapter
```

## Implementation Steps

1. Create `client/apps/web/` directory structure
2. Create package.json, tsconfig.json, vite.config.ts, index.html
3. Create main.tsx with providers
4. Create router.tsx with routes
5. Create app.tsx with responsive layout
6. Create page stubs (login, register, vault, settings, onboarding)
7. Modify @vaultic/ui ThemeProvider — add storageAdapter prop
8. Modify @vaultic/ui I18nProvider — add storageAdapter prop
9. Add global CSS (Inter font, reset, design tokens as CSS vars)
10. Run `pnpm install` from root
11. Run `pnpm --filter @vaultic/web dev` — verify app loads
12. Run `tsc --noEmit` — verify no type errors

## Todo

- [x] Create client/apps/web/ directory
- [x] Create package.json
- [x] Create tsconfig.json
- [x] Create vite.config.ts with proxy
- [x] Create index.html
- [x] Create main.tsx with providers
- [x] Create router.tsx
- [x] Create app.tsx (responsive layout)
- [x] Create 5 page stubs
- [x] Add storageAdapter prop to ThemeProvider
- [x] Add storageAdapter prop to I18nProvider
- [x] Add global CSS with design tokens
- [x] pnpm install + verify dev server works
- [x] tsc --noEmit passes

## Success Criteria

- `pnpm --filter @vaultic/web dev` starts on port 5180
- All routes render stub pages
- ThemeProvider works with localStorage (dark/light toggle)
- I18nProvider works with localStorage (en/vi toggle)
- Responsive layout centered at 480px max
- No TypeScript errors

## Security Considerations

- Vite proxy config only in dev — production uses nginx/same-origin
- No sensitive env vars in client code (VITE_ prefix only)
