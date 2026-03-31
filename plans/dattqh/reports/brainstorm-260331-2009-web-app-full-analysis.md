# Brainstorm: Vaultic Web App — Full Analysis Report

**Date:** 2026-03-31
**Status:** Approved — ready for planning

---

## 1. Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vite + React (SPA) | No SSR needed, less boilerplate than Next.js (~220 LOC less, ~10 fewer files), 100% client-side crypto |
| Auth | httpOnly cookies | XSS-proof refresh tokens, simpler frontend code |
| Features | Full parity | Sync scheduling, password generator, auto-lock, clipboard — reimplemented with web APIs |

## 2. Reuse Analysis — 84%

| Component | LOC | Reuse % | Notes |
|-----------|-----|---------|-------|
| @vaultic/types | 220 | 100% | Drop-in |
| @vaultic/crypto | 363 | 100% | Drop-in, WebCrypto + hash-wasm |
| @vaultic/storage | 401 | 100% | Drop-in, IndexedDB standard |
| @vaultic/sync | 261 | 100% | Drop-in, browser-native |
| @vaultic/api | 139 | 100% | Drop-in, ofetch universal |
| @vaultic/ui | 904 | 97% | Provider adapter needed (chrome.storage → localStorage) |
| Extension components | 2,500 | 100% | Auth/vault/settings/share UI copy |
| Extension lib utils | 800 | 45% | Rewrite storage/auth layer |
| Backend | 1,312 | 92% | Add cookie auth endpoints |
| **Total** | **6,900** | **84%** | **1,170 LOC new** |

## 3. Dropped (extension-only, ~1,000 LOC)

- WXT entrypoints (background.ts, content.ts) — 200 LOC
- Content scripts (form-detector, autofill-icon, credential-capture, save-banner) — 400 LOC
- Background handlers using chrome.alarms — 300 LOC
- Chrome types/config — 100 LOC

## 4. New Code Breakdown (~1,170 LOC)

| Hạng mục | LOC | Days |
|----------|-----|------|
| Vite + React shell (config, router, layout, responsive) | ~600 | 2 |
| Web storage adapter + httpOnly auth | ~280 | 1.5 |
| Web auto-lock + sync scheduling + clipboard | ~130 | 0.5 |
| Provider adapters (theme/i18n) | ~30 | 0.5 |
| Backend cookie auth endpoints | ~100 | 0.5 |
| **Total** | **~1,170** | **~5 days code** |

+2-3 days test/polish → **7-8 days total**

## 5. Monorepo Structure Issues (fix before web app)

### Issue #1: Code stuck in extension (should be shared)

| File | LOC | Move to |
|------|-----|---------|
| `extension/src/lib/fetch-with-auth.ts` | 50 | @vaultic/api |
| `extension/src/lib/vault-crypto.ts` | 39 | @vaultic/crypto |
| `extension/src/lib/sync-api-transforms.ts` | 58 | @vaultic/api |
| `extension/src/lib/encoding-utils.ts` | 26 | @vaultic/crypto |
| **Total** | **173** | |

### Issue #2: Missing `exports` field in package.json

All packages use legacy `main`/`types` only. Need `exports` field for tree-shaking + subpath imports.

### Issue #3: Design tokens coupled with React (defer — not needed for web)

## 6. Online Features — Web App Adaptation

| Feature | Reuse | Change |
|---------|-------|--------|
| Register | 100% | UI layout only |
| Login | 80% | JWT localStorage → httpOnly cookie |
| Token refresh | Rewrite | Backend set cookie, frontend simpler |
| Sync push/pull | 100% | @vaultic/sync drop-in |
| Sync scheduling | Rewrite | setInterval + visibilitychange (not chrome.alarms) |
| Secure Share create | 100% | share-crypto.ts + UI copy |
| Secure Share view | 100% | Backend SSR handles |
| Upgrade offline→online | 95% | Storage adapter change |
| Sync preferences | 80% | chrome.storage → localStorage |

### httpOnly Auth — Backend Changes (~100 LOC)

```
POST /api/v1/auth/login     → set httpOnly cookie (refresh), body = access token only
POST /api/v1/auth/refresh   → read cookie, return new access token
POST /api/v1/auth/logout 🆕 → clear httpOnly cookie
GET  /api/v1/auth/me     🆕 → check session from cookie
```

### Sync Scheduling — Web Approach

- `setInterval(sync, 5min)` — while tab open
- `visibilitychange` → sync when tab regains focus
- `beforeunload` → quick push before close
- No background sync (extension handles that)

## 7. Vite+React vs Next.js Comparison

| | Vite+React | Next.js |
|--|-----------|---------|
| LOC new | ~1,170 | ~1,390 (+19%) |
| Files new | ~8 | ~18+ |
| Complexity | Low | Medium (SSR/client boundary) |
| Reuse friction | Near 0 | "use client" everywhere |
| Build speed | Faster | Slower |

**Winner: Vite+React** — no SSR needed, crypto is client-side only.

## 8. Recommended Implementation Order

1. **Phase 0: Refactor packages** (0.5 day) — Move 4 lib files, add exports fields
2. **Phase 1: Web app shell** (2 days) — Vite config, router, layout, responsive
3. **Phase 2: Auth + storage** (1.5 days) — httpOnly backend endpoints, web-storage adapter
4. **Phase 3: Core features** (1 day) — Vault CRUD, sync, share (mostly reuse)
5. **Phase 4: Web-specific features** (0.5 day) — Auto-lock, sync scheduler, clipboard
6. **Phase 5: Test + polish** (2-3 days) — E2E, security audit, responsive QA

## 9. Target Structure

```
client/apps/
├── extension/          # Existing Chrome extension
│   └── src/lib/        # Only chrome-specific code remains
└── web/                # 🆕 Vite+React SPA
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── router.tsx
        ├── lib/
        │   ├── web-storage.ts        # sessionStorage/localStorage adapter
        │   ├── web-auth.ts           # httpOnly cookie auth flow
        │   └── web-sync-scheduler.ts # setInterval + visibilitychange
        ├── stores/                   # Adapted from extension (zustand)
        └── pages/                    # Route pages (responsive layout)
```
