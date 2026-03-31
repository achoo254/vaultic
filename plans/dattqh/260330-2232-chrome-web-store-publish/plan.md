# Chrome Web Store Publish — Vaultic Extension

```yaml
status: in-progress
priority: high
effort: 5-7 days
branch: feat/chrome-web-store-publish
blockedBy: []
blocks: [260330-2154-extension-auto-update]
```

---

## Overview

Publish Vaultic Password Manager extension lên Chrome Web Store (public). Bao gồm: privacy policy, store listing, visual assets, permission justifications, landing page, và production build.

**Approach:** B — Full Store Presence
**Domain:** vaultic.inetdev.io.vn
**Account:** Cá nhân ($5 one-time)

## Brainstorm Report
- [brainstorm-260330-2232-chrome-web-store-publish.md](../reports/brainstorm-260330-2232-chrome-web-store-publish.md)

## Cross-Plan Dependencies

| Plan | Relationship | Notes |
|------|-------------|-------|
| i18n-bilingual-support | Recommended before | Extension UI bilingual = better store presence, nhưng không blocking |
| extension-auto-update | This plan blocks | Sau khi trên CWS, auto-update ít cần thiết (Chrome handles it) |

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Manifest & icons prep | `done` | [phase-01](phase-01-manifest-icons-prep.md) |
| 1B | First-run privacy consent UI | `done` | [phase-01b](phase-01b-first-run-consent-ui.md) |
| 1C | Resolve unresolved questions | `done` | [phase-01c](phase-01c-resolve-unresolved-questions.md) |
| 2 | Privacy Policy & Terms of Service | `done` | [phase-02](phase-02-privacy-policy-tos.md) |
| 3 | Store listing content | `done` | [phase-03](phase-03-store-listing-content.md) |
| 4 | Visual assets (screenshots + promotional) | `partial` | [phase-04](phase-04-visual-assets.md) |
| 5 | Landing page | `done` | [phase-05](phase-05-landing-page.md) |
| 6 | Production build & submission | `pending` | [phase-06](phase-06-production-build-submit.md) |

## Key Decisions

- Host permissions: giữ `<all_urls>` + strong justification (open-source + Bitwarden precedent)
- **Fallback plan:** nếu `<all_urls>` bị reject → chuyển `activeTab` pattern + resubmit
- Zero analytics disclosure
- Privacy policy hosted at `vaultic.inetdev.io.vn/privacy-policy`
- **First-run consent UI required** — Google yêu cầu prominent disclosure trong extension, không chỉ privacy policy page
- Category: Productivity
- Languages: EN (primary) + VI

## Research Reports
- [Brainstorm](../reports/brainstorm-260330-2232-chrome-web-store-publish.md)
- [Researcher: CWS publishing requirements](../reports/researcher-260330-2236-chrome-webstore-publishing.md)
