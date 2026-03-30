# Phase 2: Privacy Policy & Terms of Service

## Status: `pending`
## Priority: Critical (blocker for submission)
## Effort: 1 day

---

## Overview

Soạn Privacy Policy và Terms of Service cho Vaultic. Host tại `vaultic.inetdev.io.vn`. Privacy Policy là **bắt buộc** cho Chrome Web Store submission — đặc biệt cho password manager category.

## Context Links
- [Brainstorm report](../reports/brainstorm-260330-2232-chrome-web-store-publish.md)
- [Security policy](../../../docs/security-policy.md)

## Requirements

### Privacy Policy — Mandatory Sections

1. **Introduction** — Vaultic là gì, zero-knowledge architecture
2. **Data Collected:**
   - Email address (optional, chỉ khi user đăng ký account)
   - Encrypted vault data (AES-256-GCM, server never sees plaintext)
   - Master password → NEVER stored/transmitted (Argon2id key derivation client-side)
3. **Data NOT Collected:**
   - No analytics, no telemetry, no tracking
   - No browsing history
   - No third-party cookies/pixels
4. **How Data is Used:**
   - Authentication (JWT tokens)
   - Optional cloud sync (user opt-in)
   - Secure share (encrypted link generation)
5. **Data Storage & Security:**
   - Local: IndexedDB (encrypted at rest)
   - Server: encrypted blobs only (when sync enabled)
   - Encryption: AES-256-GCM + Argon2id (64MB, 3 iterations)
   - HTTPS only (TLS 1.2+)
6. **Data Sharing:** None. Zero third-party sharing.
7. **User Rights:**
   - Export vault data (JSON)
   - Delete all server data (sync off → purge)
   - Delete account entirely
   - GDPR compliant
8. **Data Retention:**
   - Local: until user deletes
   - Server: until user disables sync (purge option) or deletes account
9. **Children:** Not directed at children under 13
10. **Contact:** Developer email
11. **Changes:** How users notified of policy changes
12. **Effective Date:** Publication date

### Terms of Service — Recommended Sections

1. Acceptance of terms
2. Description of service (password manager, not financial advice)
3. User responsibilities (master password custody, backup)
4. Disclaimer of warranties (AS-IS for open-source)
5. Limitation of liability
6. Open-source license (MIT)
7. Termination
8. Governing law
9. Contact

## Related Code Files

- **Create:** `docs/privacy-policy.md` — source of truth (markdown)
- **Create:** `docs/terms-of-service.md` — source of truth (markdown)
- **Deploy:** HTML versions at `vaultic.inetdev.io.vn/privacy-policy` and `/terms`

## Implementation Steps

1. Write Privacy Policy in `docs/privacy-policy.md` (English)
2. Write Terms of Service in `docs/terms-of-service.md` (English)
3. Review cả 2 docs against crypto architecture trong `docs/security-policy.md`
4. Deploy HTML versions lên `vaultic.inetdev.io.vn`
5. Verify URLs accessible: `https://vaultic.inetdev.io.vn/privacy-policy`

## Todo List

- [ ] Write privacy-policy.md
- [ ] Write terms-of-service.md
- [ ] Cross-check với security-policy.md
- [ ] Deploy to vaultic.inetdev.io.vn
- [ ] Verify live URLs

## Success Criteria

- Privacy Policy covers all 12 mandatory sections
- URLs publicly accessible via HTTPS
- Content accurately reflects Vaultic's zero-knowledge architecture
- No claims about features not yet implemented
