---
name: Web App Feature Parity with Extension
status: pending
created: 2026-04-02
branch: main
blockedBy: []
blocks: []
---

# Web App Feature Parity with Extension

Port 4 missing features from extension to web app. Extension has full implementations; web vault store already supports all operations (folders, CRUD). No i18n in web — use plain strings.

## Phases

| # | Phase | Files | Effort | Status |
|---|-------|-------|--------|--------|
| 1 | [Password Generator Full Config](phase-01-password-generator.md) | 1 new page + update layout/router | Small | Pending |
| 2 | [Folder Management](phase-02-folder-management.md) | 2 new components + update vault page | Medium | Pending |
| 3 | [Security Health](phase-03-security-health.md) | 1 new page + update layout/router | Small | Pending |
| 4 | [Share Credential](phase-04-share-credential.md) | Rewrite share page | Medium | Pending |

## Architecture

```
client/apps/web/src/
├── components/
│   ├── app-layout.tsx          # UPDATE: add Generator + Health nav items
│   ├── folder-bar.tsx          # NEW: horizontal folder filter chips
│   └── folder-select.tsx       # NEW: folder dropdown for item form
├── pages/
│   ├── generator-page.tsx      # NEW: full password generator page
│   ├── vault-page.tsx          # UPDATE: add FolderBar + FolderSelect in form
│   ├── health-page.tsx         # NEW: security health audit page
│   └── share-page.tsx          # REWRITE: vault item share + quick share
└── router.tsx                  # UPDATE: add /generator, /health routes
```

## Key Decisions
- **Dedicated generator page** (not modal) — extension uses tab, web should use sidebar nav page
- **Folder bar inline** on vault page (not separate page) — matches extension UX
- **No i18n** — web doesn't use react-i18next, use plain English strings
- **Reuse web vault store as-is** — already has folder CRUD, selectedFolder, setSelectedFolder
- **Port share crypto** from extension lib, use web's `fetchWithAuth`

## Dependencies
- `@vaultic/crypto`: `generatePassword`, `encryptShareToUrl`, `estimateFragmentSize`, `MAX_FRAGMENT_LENGTH`, `encryptFolderName`, `decryptFolderName`
- `@vaultic/ui`: Button, Card, Input, Modal, tokens, useTheme
- `@vaultic/types`: LoginCredential, PasswordGenOptions
- Web stores: `useVaultStore`, `useAuthStore`
- Web lib: `fetchWithAuth` from `web-auth-fetch.ts`
