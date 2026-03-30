---
title: "Security Audit Fixes — Full Sweep"
description: "Fix all 18 findings from codebase security audit (P0-P3)"
status: completed
priority: P1
effort: 16h
branch: fix/security-audit-sweep
tags: [security, audit, p0, sync, crypto]
created: 2026-03-30
completed: 2026-03-30
---

# Security Audit Fixes

**Source:** [Full Audit Report](../reports/codebase-review-260330-0936-full-audit.md)
**Scope:** 18 items across P0-P3, organized into 5 parallel-safe phases

## Phase Overview

| Phase | Focus | Items | Effort | Parallel | Status |
|-------|-------|-------|--------|----------|--------|
| [Phase 1](phase-01-backend-security.md) | Backend Security | 3,4,8,9,13 | 4h | Yes | Completed |
| [Phase 2](phase-02-extension-auth-crypto.md) | Extension Auth & Crypto | 1,2,5 | 4h | Yes | Completed |
| [Phase 3](phase-03-extension-content-autofill.md) | Content Scripts & Autofill | 6,7,E-C3,E-C4 | 3h | Yes | Completed |
| [Phase 4](phase-04-storage-sync-integrity.md) | Storage & Sync Integrity | 10,11,12,14 | 3h | Yes | Completed |
| [Phase 5](phase-05-code-quality.md) | Code Quality (P3) | 15,16,17,18 | 2h | After 1-4 | Completed |

## File Ownership (Parallel Safety)

- **Phase 1:** `backend/src/**` (all backend files)
- **Phase 2:** `auth-store.ts`, `session-storage.ts`, `client/packages/crypto/src/kdf.ts`
- **Phase 3:** `content.ts`, `credential-handler.ts`, `field-filler.ts`, `export-vault.tsx`, content/ dir
- **Phase 4:** `client/packages/storage/src/**`, `client/packages/sync/src/**`
- **Phase 5:** Cross-cutting — runs after phases 1-4 complete

## Dependency Graph

```
Phase 1 ──┐
Phase 2 ──┤
Phase 3 ──┼──> Phase 5 (code quality)
Phase 4 ──┘
```

Phases 1-4 have ZERO file overlap and can execute in parallel.

## Validated Decisions

1. E-C2: Register first, re-encrypt on success only
2. B-C4: New `AUTH_HASH_KEY` env var separate from JWT_SECRET
3. E-C3: Fill-by-ID pattern (background fills via chrome.scripting.executeScript)
4. ADV-01: tokenVersion in User model, embed in JWT, increment on password change
5. Share auth: Keep anonymous, no rate limit needed
6. P-C2 HKDF salt: DEFERRED
7. Sync: LIVE with users — P2 items are urgent

## Rollback Strategy

Each phase is independently revertible via `git revert`. No phase modifies shared state that another phase depends on. Backend deployment can roll back independently from extension.

## Success Criteria

- [x] All P0 items verified fixed (manual test + code review)
- [x] `tsc --noEmit` passes for both backend and client
- [x] Existing tests pass (`pnpm test`)
- [x] No regression in vault CRUD, sync, or share flows
