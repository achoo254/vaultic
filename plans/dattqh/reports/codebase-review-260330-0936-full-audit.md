# Vaultic Codebase Review — Full Audit Report

**Date:** 2026-03-30 | **Branch:** main | **Reviewers:** 3 parallel + 1 adversarial

## Scope

| Area | Files | LOC |
|------|-------|-----|
| Backend (`backend/src/`) | 21 | ~1,044 |
| Extension (`client/apps/extension/src/`) | 53 | ~5,855 |
| Client packages + shared types | 30+ | ~2,500 |
| **Total** | **104+** | **~9,400** |

---

## Executive Summary

Architecture solid for MVP — clean Route→Service→Model, proper package boundaries, good crypto primitives (AES-256-GCM, Argon2id). **However, 13 Critical + 10 High issues found across security, state management, and data integrity — several are production-blocking for a password manager.**

---

## CRITICAL Issues (13)

### Backend (4)

| ID | Issue | File | Impact |
|----|-------|------|--------|
| B-C1 | Refresh token never checks if user exists | `auth-service.ts:57-64` | Deleted/banned user keeps access 7d |
| B-C2 | Registration TOCTOU race | `auth-service.ts:24-33` | Duplicate accounts on concurrent signup |
| B-C3 | Share `_id` client-controlled + TOCTOU | `share-service.ts:26-48` | ID squatting, duplicate shares |
| B-C4 | JWT secret reused as HMAC key | `auth-service.ts:7-9` | Key compromise cascades |

### Extension (5)

| ID | Issue | File | Impact |
|----|-------|------|--------|
| E-C1 | `auth_hash` stored in chrome.storage | `auth-store.ts:120,165` | Any extension can impersonate user |
| E-C2 | `upgradeToOnline` re-encrypts BEFORE register | `auth-store.ts:282-318` | Vault corruption if registration fails |
| E-C3 | Plaintext passwords in message passing | `credential-handler.ts:24-43` | XSS can intercept credentials |
| E-C4 | "Encrypted export" is actually plaintext | `export-vault.tsx:33-34` | False security claim |
| E-C5 | Content script on `<all_urls>` | `content.ts:9` | Runs on chrome://, file:// pages |

### Client Packages (4)

| ID | Issue | File | Impact |
|----|-------|------|--------|
| P-C1 | Master key not zeroed from memory | `kdf.ts` | Key extractable from memory dump |
| P-C2 | HKDF uses empty salt | `kdf.ts:49` | Weakened key independence |
| P-C3 | Sync engine has ZERO error handling | `sync-engine.ts` | Data loss on network failure |
| P-C4 | `dequeueAll` doesn't dequeue | `indexeddb-sync-queue.ts` | Misleading API, potential data loss |

---

## HIGH Issues (10)

| ID | Issue | File |
|----|-------|------|
| B-H1 | No rate limit on share endpoints | `share-route.ts` |
| B-H2 | Rate limiter `req.ip` = 127.0.0.1 behind nginx | `rate-limit-middleware.ts` |
| B-H3 | JWT no algorithm pinning | `jwt-utils.ts` |
| E-H1 | Vault store race condition (stale state) | `vault-store.ts` |
| E-H2 | Token refresh no concurrency guard | `fetch-with-auth.ts` |
| E-H3 | Domain matching `url.includes(domain)` | `credential-handler.ts` |
| P-H1 | `putItem`/`putFolder` bypass userId check | `indexeddb-store.ts` |
| P-H2 | `openDB()` cache stale after `clear()` | `indexeddb-store.ts` |
| P-H3 | No token refresh / 401 retry in API client | `api/` |
| P-H4 | LWW resolver compares string timestamps | `sync-engine.ts` |

---

## Adversarial Findings (7 ACCEPT, 6 DEFER)

### Must Fix (ACCEPT)

| ID | Severity | Issue |
|----|----------|-------|
| ADV-01 | Critical | Password change doesn't revoke existing tokens |
| ADV-02 | Critical | upgradeToOnline corrupts vault on failure (confirms E-C2) |
| ADV-03 | High | Rate limiter bypass via IP spoofing + no account-level limiting |
| ADV-04 | High | Sync push UUID collision crashes entire batch |
| ADV-05 | High | Anonymous share creation — unlimited, no rate limit |
| ADV-07 | High | Encryption key `extractable: true` + raw bytes in storage |
| ADV-09 | Medium | Sync push no replay protection |

### Track (DEFER)

ADV-06 (CORS risk), ADV-08 (device topology leak), ADV-10 (server hash weak), ADV-11 (offline brute-force via verifier), ADV-12 (deleteFolder race), ADV-13 (autofill password exposure to page JS)

---

## MEDIUM Issues Summary

- **Backend (8):** itemType default mismatch (`1` vs `'login'`), sync-service 212 lines, unused import, share ID modulo bias, no max length on encryptedData, wrong 401→403 on share delete, no MongoDB connection options, CORS undocumented
- **Extension (9):** auth-store 443 lines, settings-page 375 lines, ~15 hardcoded colors, MutationObserver never disconnected, duplicate utility functions (escapeHtml x3, base64 x2), `as never` cast, anonymous share abuse
- **Packages (5):** Sync pull no pagination, SyncApiAdapter mismatch, no tests for KDF/sync/URL codec, VaultItem.user_id required but undefined at runtime, password generator no char class guarantee

---

## Positive Observations

- Timing-safe comparison for auth hashes
- Zod validation on all backend inputs
- AES-256-GCM with random nonce, rejection sampling (no modulo bias) in crypto
- Shadow DOM isolation in content scripts
- `bulkWrite` in sync (no N+1)
- TTL index on SecureShare for auto-cleanup
- Clean package boundaries with `@vaultic/*` imports
- IndexedDB v2→v3 migration handles userId correctly
- Design tokens centralized in `@vaultic/ui`

---

## Recommended Fix Priority

### P0 — Production Blockers (fix before any release)
1. **E-C2 / ADV-02** — upgradeToOnline: register first, re-encrypt on success
2. **E-C1** — Stop storing auth_hash in chrome.storage
3. **B-C1 / ADV-01** — Add tokenVersion, revoke on password change
4. **B-C4** — Separate AUTH_HASH_KEY from JWT_SECRET
5. **ADV-07** — Set encryption key `extractable: false`

### P1 — Security Hardening (fix before public beta)
6. **E-C5** — Restrict content script to http/https only
7. **E-H3** — Fix domain matching (extract + compare, not includes)
8. **B-H2** — Configure `trust proxy` for nginx
9. **B-H1 / ADV-05** — Rate limit share endpoints
10. **P-H1** — Add userId check on write operations

### P2 — Data Integrity (fix before sync goes live)
11. **P-C3** — Add error handling to sync engine
12. **P-H4** — Parse timestamps as Date for LWW comparison
13. **ADV-04** — Use `bulkWrite({ ordered: false })`, handle errors
14. **P-H2** — Reset dbPromise after clear()

### P3 — Code Quality
15. Modularize 4 files over 200 lines
16. Replace ~15 hardcoded colors with design tokens
17. DRY duplicate utilities (escapeHtml, base64)
18. Fix itemType mismatch (`1` vs `'login'`)

---

## Detailed Reports

- [Backend audit](code-reviewer-260330-0936-backend-full-audit.md)
- [Extension audit](code-reviewer-260330-0936-extension-full-security-review.md)
- [Client packages audit](code-reviewer-260330-0936-client-packages-deep-review.md)
- [Adversarial review](code-reviewer-260330-0941-adversarial-security-review.md)

---

## Validation Summary

**Validated:** 2026-03-30
**Questions asked:** 8

### Confirmed Decisions
- **Fix scope:** Full sweep (all 18 items, P0→P3)
- **E-C2 upgradeToOnline:** Register first, re-encrypt on success only
- **B-C4 key separation:** New `AUTH_HASH_KEY` env var (separate from JWT_SECRET)
- **E-C3 autofill:** Fill-by-ID pattern (background fills directly via chrome.scripting)
- **ADV-01 token revocation:** tokenVersion in User model, embed in JWT, increment on password change
- **Share auth:** Keep anonymous, no rate limit needed (user decision)
- **P-C2 HKDF salt:** Defer — Argon2id already uses per-user random salt, empty HKDF salt is low risk. Fix when migration framework exists
- **Sync status:** LIVE with real users — P2 fixes (error handling, pagination, LWW) are urgent

### Action Items
- [ ] Create implementation plan with all 18 items across P0-P3
- [ ] P2 items elevated in priority since sync is live
- [ ] Add `AUTH_HASH_KEY` to `.env.example` and deployment docs
- [ ] HKDF salt fix deferred — track as future improvement

---

## Unresolved Questions

1. License file removed intentionally? Repo currently has no license.
2. `.claude/session-state/` was tracked in git — should gitignore (done this session).
3. `vaultic-server.tar.gz` (35MB) removed — was this the only deployment artifact?
4. Share feature: should anonymous metadata creation require auth or CAPTCHA?
5. Sync pagination (`has_more`/`next_cursor`): is server already paginating but client ignoring, or server also unbounded?
