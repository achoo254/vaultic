# Security Audit: Auto Cloud Sync Design

**Date:** 2026-03-30
**Scope:** Design review of `brainstorm-260330-1611-auto-cloud-sync.md` + existing sync code
**Methodology:** STRIDE + OWASP Top 10

## Summary

- Files scanned: 10 (sync-engine, sync-service, sync-route, auth-middleware, fetch-with-auth, use-sync-settings, auth-store, rate-limit, indexeddb-sync-queue, sync-ops-builders)
- Findings: **2 Critical, 3 High, 4 Medium, 3 Low, 2 Info**

---

## Findings

| # | Severity | Category | Location | Description | Fix Recommendation |
|---|----------|----------|----------|-------------|-------------------|
| 1 | **Critical** | DoS (STRIDE-D) | `sync-route.ts` | **No rate limit on sync endpoints.** Auth routes have rate limits but `/api/v1/sync/push` and `/pull` have none. Auto-sync every 3min from many devices = easy amplification. Malicious user could flood push/pull. | Add `rateLimit(60_000, 30)` to push, `rateLimit(60_000, 60)` to pull. Rate limit per userId, not just IP. |
| 2 | **Critical** | Tampering (STRIDE-T) | `sync-engine.ts:102` | **Pull pagination not looped.** Only pulls 1 page (100 items). Attacker with server access could poison page 1 while hiding real data in page 2+. More critically: large vaults silently lose data on pull. | Loop `has_more` + `next_cursor` until all pages fetched. Add max page limit (e.g., 50 pages = 5000 items) as safety cap. |
| 3 | **High** | Spoofing (STRIDE-S) | `sync-engine.ts:46`, design | **No sync mutex — race condition.** Real-time push + periodic alarm + unlock trigger could all call `sync()` simultaneously. Concurrent pushes could create duplicate items or corrupt queue state. | Add `isSyncing` lock flag in SyncEngine. If locked, skip or queue. Critical for the 3-trigger design. |
| 4 | **High** | Tampering (STRIDE-T) | `use-sync-settings.ts:106-131` | **handleEnableSyncConfirm bypasses SyncEngine.** Direct fetchWithAuth → no conflict resolution, no queue management, no error recovery. Could overwrite newer server data on first enable. | Refactor to use `SyncEngine.sync()` — already in scope per brainstorm. |
| 5 | **High** | Info Disclosure (STRIDE-I) | `fetch-with-auth.ts:30-38` | **Refresh token sent in JSON body over HTTP fallback.** `API_BASE_URL` defaults to `http://localhost:8080`. If misconfigured in prod without HTTPS, refresh token transmitted in cleartext. Auto-sync amplifies exposure (token sent every 3min). | Enforce HTTPS check: reject non-localhost HTTP URLs. Add `Secure` flag validation. |
| 6 | **Medium** | Tampering (STRIDE-T) | `sync-service.ts:106` | **`server_time` generated before query.** `serverTime = new Date().toISOString()` set before DB query. If query is slow, client's `last_sync` cursor could miss items inserted during query execution. | Set `server_time` AFTER query completes, or use MongoDB `$currentDate`. |
| 7 | **Medium** | DoS (STRIDE-D) | design: chrome.alarms | **No exponential backoff on sync failure.** If server is down, alarm fires every 3min indefinitely → hammers failed server. Combined with immediate retry on CRUD → even more requests. | Implement backoff: 3min → 6min → 12min → max 30min on consecutive failures. Reset on success. |
| 8 | **Medium** | Repudiation (STRIDE-R) | `sync-engine.ts` | **No audit trail for sync operations.** `console.error` only on failure. No logging of what was pushed/pulled/merged. If data loss occurs, no forensic trail. | Add structured sync log: `{ action, userId, pushed, pulled, conflicts, timestamp }`. Store in metadata or emit event. |
| 9 | **Medium** | Elevation (STRIDE-E) | `indexeddb-store` (bug fix scope) | **device_id hardcoded `''`.** All items from this device have empty `device_id` → server's `deviceId: { $ne: deviceId }` filter with actual deviceId will pull back this device's own items, causing duplicate data. | Fix: use `getDeviceId()` when creating items. Already in bug fix scope. |
| 10 | **Low** | Tampering (STRIDE-T) | `conflict-resolver.ts` | **LWW relies on client-generated timestamps.** Malicious client could set `updated_at` far in future → always wins conflicts, overwriting legitimate data from other devices. | Server should validate `updatedAt` is not in the future (> server_time + tolerance). Add in `sync-route.ts` Zod validation. |
| 11 | **Low** | DoS (STRIDE-D) | `rate-limit-middleware.ts` | **In-memory rate limiter doesn't survive restart.** PM2 restart clears all rate limit state. Multi-process PM2 = separate stores per worker. | Accept for MVP. Document as known limitation. Consider Redis-based limiter for production scale. |
| 12 | **Low** | Info Disclosure (STRIDE-I) | `sync-engine.ts:94-95` | **Error details logged to console.** `console.error('[SyncEngine] push failed', err)` may expose stack traces with sensitive info in browser devtools. | Use sanitized error logging. Don't log full error objects in production builds. |
| 13 | **Info** | Best Practice | design: background.ts | **chrome.alarms minimum is 1 minute.** Design uses 3min which is fine. But alarm registration should be idempotent — multiple `chrome.alarms.create` with same name replaces previous, which is correct behavior. | Document that alarm name must be constant (`"vaultic-sync"`) to avoid duplicate alarms. |
| 14 | **Info** | Best Practice | design: overall | **No sync status indicator in UI during auto-sync.** User won't know if background sync succeeded/failed unless they open Settings. | Consider badge/icon indicator for sync status. Low priority but improves UX trust. |

---

## OWASP Top 10 Mapping

| OWASP | Findings |
|-------|----------|
| A01 Broken Access Control | — (auth middleware OK, userId scoped) |
| A02 Cryptographic Failures | #5 (HTTP fallback risk) |
| A03 Injection | — (Zod validation on inputs OK) |
| A04 Insecure Design | #2 (pagination), #3 (race condition), #4 (bypass SyncEngine) |
| A05 Security Misconfiguration | #11 (rate limiter stateless) |
| A06 Vulnerable Components | — (no dep audit needed for design review) |
| A07 Auth Failures | #5 (refresh token exposure) |
| A08 Data Integrity | #10 (future timestamp), #6 (server_time ordering) |
| A09 Logging/Monitoring | #8 (no audit trail), #12 (error info leak) |
| A10 SSRF | — (not applicable) |

---

## STRIDE Summary

| Threat | Count | Severity Range |
|--------|-------|---------------|
| **S**poofing | 1 | High |
| **T**ampering | 4 | Critical–Low |
| **R**epudiation | 1 | Medium |
| **I**nfo Disclosure | 2 | High–Low |
| **D**enial of Service | 3 | Critical–Low |
| **E**levation of Privilege | 1 | Medium |

---

## Priority Fix Order

### Must fix BEFORE implementing auto-sync:
1. **#1** — Add rate limits to sync endpoints (Critical, trivial to add)
2. **#3** — Add sync mutex/lock (High, required for 3-trigger design)
3. **#2** — Fix pagination loop (Critical, already in scope)
4. **#4** — Fix handleEnableSyncConfirm (High, already in scope)
5. **#9** — Fix device_id (Medium, already in scope)

### Should fix during implementation:
6. **#7** — Exponential backoff on failures
7. **#5** — HTTPS enforcement for non-localhost
8. **#6** — server_time after query
9. **#10** — Future timestamp validation

### Can defer:
10. **#8** — Audit trail logging
11. **#11** — Persistent rate limiter
12. **#12** — Sanitized error logging
13. **#13, #14** — Info items

---

## Unresolved Questions

1. Should rate limit be per-IP or per-userId for sync endpoints? Per-userId is more secure but requires auth parsing before rate check.
2. Max vault size assumption? Pagination safety cap (50 pages × 100 = 5000 items) — is this enough?
3. Should sync failures trigger user notification (toast/badge) or stay silent?
