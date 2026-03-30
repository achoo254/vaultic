# Brainstorm: Publish Vaultic Extension lên Chrome Web Store

**Date:** 2026-03-30
**Approach:** B — Full Store Presence
**Domain:** vaultic.inetdev.io.vn
**Account:** Cá nhân
**Visibility:** Public
**Analytics:** Zero (không thu thập gì)

---

## Problem Statement

Vaultic extension cần publish lên Chrome Web Store. Extension đã hoàn thiện về mặt kỹ thuật (MV3, CSP, crypto) nhưng thiếu toàn bộ store-facing assets: privacy policy, screenshots, descriptions, permission justifications, và promotional materials.

---

## Quyết định đã thống nhất

### Host Permissions → Hybrid (Option 3)
- Giữ `host_permissions: ["http://*/*", "https://*/*"]`
- Viết justification chi tiết, cite open-source + precedent (Bitwarden)
- Content script security: fill-by-ID pattern, không expose plaintext

### Data Disclosures
- Zero analytics, zero tracking
- Authentication info: encrypted passwords (functionality only)
- PII: email for optional registration
- Financial: encrypted payment cards in vault
- Certifications: encrypted transit + at rest, no selling, user can delete

---

## Deliverables Checklist

### 1. Developer Account Setup
- [ ] Đăng ký Chrome Web Store Developer ($5)
- [ ] Identity verification (cần 1-3 ngày)

### 2. Privacy Policy (CRITICAL — blocker)
- [ ] Soạn privacy policy tiếng Anh
- [ ] Host tại `https://vaultic.inetdev.io.vn/privacy-policy`
- [ ] Nội dung bắt buộc:
  - What data collected: email (optional registration), encrypted vault data
  - Zero-knowledge: server never sees plaintext
  - Encryption: AES-256-GCM + Argon2id
  - Master password never transmitted/stored
  - No analytics, no tracking, no 3rd party sharing
  - User rights: export, delete all data
  - Data retention: sync off → purge option
  - Contact info developer
  - Policy change notification method

### 3. Store Listing — Description
- [ ] Short description (132 chars): first line shown in search
- [ ] Full description (EN): features, security model, open-source
- [ ] Full description (VI): bản dịch
- [ ] Keywords tự nhiên: "password manager", "zero-knowledge", "autofill", "open source", "encrypted"
- [ ] Link GitHub repo cho credibility

### 4. Visual Assets
- [ ] Icon 128x128 PNG (store listing)
- [ ] Screenshots 1280x800 (3-5 cái):
  1. Popup vault list — showing main UI
  2. Autofill in action — form detection + fill
  3. Password generator
  4. Settings / security health
  5. Share encrypted link
- [ ] Promotional tile 440x280
- [ ] Marquee banner 1400x560

### 5. Permission Justifications (6 permissions)

| Permission | Justification |
|-----------|--------------|
| `storage` | Stores encrypted vault data locally using IndexedDB for offline-first architecture. No plaintext stored. |
| `activeTab` | Detects login forms on active page to offer credential autofill. Only accesses DOM when user interacts. |
| `scripting` | Injects autofill scripts into login forms using secure fill-by-ID pattern. Content script never receives plaintext passwords. |
| `alarms` | Schedules auto-lock timer after configurable inactivity period and optional cloud sync intervals. |
| `idle` | Detects user inactivity to automatically lock vault, preventing unauthorized access on unattended devices. |
| `host_permissions` | Password manager must detect and fill login forms on any website. Uses fill-by-ID pattern — content script receives only element IDs, never plaintext. Fully open-source: https://github.com/achoo254/vaultic |

### 6. Privacy Practices Tab
- [ ] Authentication information → Yes → Functionality
- [ ] Personally identifiable info → Yes (email) → Functionality
- [ ] Financial/payment info → Yes (encrypted cards) → Functionality
- [ ] Certifications:
  - ✅ Encrypted in transit (HTTPS)
  - ✅ Encrypted at rest (AES-256-GCM)
  - ✅ User can request deletion
  - ✅ No selling to 3rd parties
  - ✅ No unrelated data use
  - ✅ No creditworthiness use

### 7. Landing Page (vaultic.inetdev.io.vn)
- [ ] Hero section: tagline + CTA install extension
- [ ] Features overview
- [ ] Security model explanation
- [ ] Link to Chrome Web Store
- [ ] Privacy Policy page
- [ ] Terms of Service page (recommended)

### 8. Build & Submit
- [ ] `pnpm build:production` → zip `.output/chrome-mv3/`
- [ ] Test production build locally trước khi submit
- [ ] Upload zip + fill all store listing fields
- [ ] Category: Productivity
- [ ] Language: English (primary) + Vietnamese
- [ ] Submit for review

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Reject vì host_permissions | Medium | 3-7 ngày delay | Justification chi tiết + cite open-source + Bitwarden precedent |
| Reject vì privacy policy thiếu | Low | Blocker | Checklist đầy đủ ở trên |
| Identity verification chậm | Low | 1-3 ngày delay | Đăng ký sớm, trước khi chuẩn bị assets |
| WASM bị flag | Very Low | Blocker | CSP `wasm-unsafe-eval` là chuẩn MV3, argon2 bundled không remote |
| Description bị reject | Low | Minor delay | Tránh marketing hyperbole, mô tả chính xác tính năng hiện có |

---

## Timeline Estimate

| Tuần | Tasks |
|------|-------|
| Ngày 1-2 | Developer account + identity verification. Soạn privacy policy + terms |
| Ngày 2-3 | Store description (EN + VI). Permission justifications |
| Ngày 3-5 | Screenshots (build production → chụp thực tế). Icons. Promotional images |
| Ngày 4-6 | Landing page tại vaultic.inetdev.io.vn |
| Ngày 6-7 | Final test production build. Submit to Chrome Web Store |
| Ngày 7-14 | Review period (3-7 business days) |

---

## Thứ tự ưu tiên thực hiện

1. **Developer account + identity verification** (làm ngay, vì cần chờ)
2. **Privacy Policy** (blocker cho submission)
3. **Permission justifications** (blocker cho submission)
4. **Store description + Privacy Practices tab** (blocker)
5. **Screenshots + Icons** (blocker)
6. **Promotional images + Landing page** (nice-to-have, không block submission)
7. **Build + Submit**

---

## Next Steps

Tạo implementation plan chi tiết với `/ck:plan` để triển khai từng deliverable.
