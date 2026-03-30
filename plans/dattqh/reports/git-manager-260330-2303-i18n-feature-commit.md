# Git Commit Report: i18n Bilingual Support Feature

**Commit Hash:** e51a5c1c67f93084743b88ab907701c363daad36  
**Branch:** main  
**Date:** 2026-03-30 23:03:56 +0700  
**Author:** dattqh <dattqh@inet.vn>

## Summary

Successfully committed all i18n bilingual support changes for Vaultic. Feature includes English/Vietnamese localization infrastructure with server-synced language preferences.

## Commit Details

**Message:**
```
feat(i18n): add bilingual support for browser extension and cloud sync

Add i18n infrastructure for English/Vietnamese localization across the Vaultic browser extension:
- i18next + react-i18next integration with 5 namespaces (common, auth, vault, settings, share)
- Language selector in Settings page with persistence
- Backend preference sync via PUT/GET /api/v1/sync/preferences endpoint
- Updated 31+ component files to use useTranslation() hook
- Preference sync with LWW conflict resolution
- User model extended with language preference field

This enables full bilingual UI support with server-synced language preferences across devices.
```

## Changes Summary

| Category | Count | Details |
|----------|-------|---------|
| **Files Modified** | 33 | Component files + config + API files |
| **New Files** | 14 | i18n config + 10 locale JSON files + provider + utils |
| **Total Lines Changed** | 1,282 insertions / 368 deletions | ~914 net additions |

## Key Files Staged

### Backend (3 files)
- `backend/src/models/user-model.ts` — User language preference field
- `backend/src/routes/sync-route.ts` — Preference sync endpoints
- `backend/package.json` — Dependencies update

### Frontend Infrastructure (3 files)
- `client/packages/ui/src/styles/i18n-provider.tsx` — I18nProvider context
- `client/apps/extension/src/i18n/i18n-config.ts` — i18next configuration
- `client/apps/extension/src/i18n/i18n-types.ts` — TypeScript types

### Locale Files (10 files)
- `client/apps/extension/src/locales/{en,vi}/{auth,common,settings,share,vault}.json`
- Both English and Vietnamese namespaces complete

### Components (31 files)
- Auth: lock-screen, login-form, register-form, setup-password-form, upgrade-account-modal
- Common: app-header, bottom-nav, copy-button, password-field
- Settings: All 8 files including language selector + preference sync
- Share: share-page, share-options, share-link-result
- Vault: 9 files (search, folder-bar, vault-list, vault-item-form, etc.)

### Utilities & API
- `client/apps/extension/src/lib/sync-preferences.ts` — Preference sync logic
- `client/packages/api/src/sync-api.ts` — API endpoints
- `client/packages/ui/src/index.ts` — Export I18nProvider

### Documentation & Config
- `docs/project-changelog.md` — Feature entry
- `docs/project-overview-pdr.md` — Minor updates
- `package.json` — Root config
- `pnpm-lock.yaml` — Dependency lock

## Files NOT Committed (As Expected)

These were excluded as they're development artifacts:
- `.claude/session-state/latest.md` — Session state
- `backend/ecosystem.config.cjs` — PM2 config (dev artifact)
- `client/packages/sync/.turbo/turbo-build.log` — Build log
- `docs/design-screens/index.html` — Generated file
- `system-design.pen` — Design file
- `LICENSE`, `backend/.claude/`, `backend/build.js`, `plans/` — Untracked

## Verification

✓ Commit created successfully  
✓ All i18n-related files staged and committed  
✓ Conventional commit format applied (`feat(i18n): ...`)  
✓ No secrets/credentials included  
✓ Development artifacts excluded  
✓ No push to remote (per instructions)

## Next Steps

- Push to remote when ready for PR
- Run tests to verify i18n implementation
- Verify locale files load correctly in extension
- Test language switching in Settings
