# Phase 1C: Resolve Unresolved Questions

## Status: `done`
## Priority: High
## Effort: 0.5 day

---

## Overview

Researcher report có 6 câu hỏi chưa trả lời. Cần audit code/infra để trả lời trước khi submit extension.

## Context Links
- [Researcher report — mục 9](../reports/researcher-260330-2236-chrome-webstore-publishing.md)
- [Security policy](../../../docs/security-policy.md)

## Questions & Audit Plan

### Q1: MongoDB encrypt at rest?

**Check:** Server MongoDB config — Atlas tự encrypt at rest, self-hosted cần verify.
**Files:** Backend deployment config, MongoDB connection string
**Action:** Nếu chưa → document trong privacy policy: "Server stores encrypted blobs only. Additional at-rest encryption depends on infrastructure provider."

### Q2: Shared link auto-delete sau expiry?

**Check:** `backend/src/models/` — SecureShare schema có TTL index?
**Files:** `backend/src/routes/share-route.ts`, `backend/src/models/`
**Expected:** MongoDB TTL index on `expiresAt` field → auto-purge
**Action:** Verify và document trong privacy policy

### Q3: Data export format?

**Check:** Settings page export feature — exports encrypted hay plaintext?
**Files:** `client/apps/extension/src/components/settings/export-vault.tsx`
**Expected:** Export decrypted JSON (user đã unlock vault)
**Action:** Document format trong privacy policy user rights section

### Q4: Master password reset possible?

**Answer:** **Không** — zero-knowledge = mất password = mất vault
**Action:** Thêm disclaimer rõ trong:
  - Privacy policy
  - Extension UI (setup password screen)
  - Store listing description

### Q5: Server validate encrypted blobs?

**Check:** `backend/src/routes/sync-route.ts` — có check blob format?
**Files:** `backend/src/services/sync-service.ts`
**Expected:** Likely không validate format — chỉ store blob
**Action:** Nếu không validate → add basic validation (non-empty, reasonable size limit)

### Q6: WASM bundled hay CDN?

**Answer:** **Bundled** — confirmed từ:
- `vite-plugin-wasm` trong wxt.config.ts
- CSP `wasm-unsafe-eval` trong manifest
- argon2-browser là npm dependency, not CDN
**Status:** ✅ OK, no action needed

## Implementation Steps

1. Audit Q1 (MongoDB encryption) — check server config
2. Audit Q2 (share TTL) — read share model/route
3. Audit Q3 (export format) — read export component
4. Document Q4 (master password non-recoverable) — add disclaimers
5. Audit Q5 (blob validation) — read sync route
6. Confirm Q6 (WASM bundled) — already verified ✅
7. Update privacy policy draft với findings
8. Update store listing description nếu cần

## Todo List

- [ ] Q1: Verify MongoDB at-rest encryption
- [ ] Q2: Verify share link TTL auto-delete
- [ ] Q3: Verify export format
- [ ] Q4: Add master password non-recovery disclaimer
- [ ] Q5: Verify/add blob validation
- [ ] Q6: Confirmed ✅
- [ ] Update privacy policy draft with findings

## Success Criteria

- All 6 questions answered with evidence from code
- Privacy policy content updated based on findings
- Any code changes (Q5 validation) tested
