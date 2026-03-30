# Phase 5: Landing Page

## Status: `pending`
## Priority: Medium (not blocking submission, but needed for `homepage_url`)
## Effort: 1-2 days

---

## Overview

Tạo landing page tại `vaultic.inetdev.io.vn` — homepage cho extension. Bao gồm: hero, features, security model, install CTA, privacy policy, terms of service.

## Requirements

### Pages

| Path | Content |
|------|---------|
| `/` | Landing page (hero + features + security + CTA) |
| `/privacy-policy` | Privacy Policy (from Phase 2) |
| `/terms` | Terms of Service (from Phase 2) |

### Landing Page Sections

1. **Hero:** Logo + "Zero-Knowledge Password Manager" + Install CTA (Chrome Web Store link)
2. **Features:** 4-6 key features with icons (autofill, generator, share, sync, offline-first, open-source)
3. **Security:** Zero-knowledge explanation, encryption specs (Argon2id, AES-256-GCM)
4. **Open Source:** GitHub link, MIT license, community
5. **Footer:** Links to privacy policy, terms, GitHub, contact

### Tech Stack

- Static HTML + CSS (hoặc simple framework)
- Host trên server hiện tại (nginx at `vaultic.inetdev.io.vn`)
- Design: Swiss Clean Minimal, match extension UI tokens
- Responsive (mobile + desktop)
- Favicon: Vaultic icon

## Implementation Steps

1. Design landing page layout
2. Build static HTML/CSS (hoặc dùng simple generator)
3. Convert privacy policy + terms to HTML pages
4. Deploy lên `vaultic.inetdev.io.vn` via nginx
5. Verify SSL (HTTPS) working
6. Test all pages accessible

## Todo List

- [ ] Design landing page
- [ ] Build HTML/CSS
- [ ] Convert privacy policy → HTML
- [ ] Convert terms of service → HTML
- [ ] Deploy to server
- [ ] Verify HTTPS + all URLs working

## Success Criteria

- `https://vaultic.inetdev.io.vn` loads landing page
- `/privacy-policy` and `/terms` accessible
- HTTPS valid (SSL cert)
- Mobile responsive
- Chrome Web Store link placeholder ready (fill after publish)
