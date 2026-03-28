---
title: "Offline-First Login & Share"
description: "Make login and share fully optional — users can use vault 100% offline without register/login"
status: complete
priority: P1
effort: 12h
branch: feat/offline-first-mode
tags: [feature, auth, share, crypto, extension]
created: 2026-03-28
---

# Offline-First Login & Share

## Overview

Make Vaultic extension usable without account/network. Two key changes:
1. **Offline Vault Mode** — set master password, skip register/login
2. **URL-Based Share** — encrypted data embedded in URL fragment, no server needed

Brainstorm: [brainstorm report](../reports/brainstorm-260328-1053-offline-first-login-share.md)
Scout: [scout report](../reports/Explore-260328-1105-vaultic-auth-share.md)

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Offline Vault Mode | Complete | 5h | [phase-01](./phase-01-offline-vault-mode.md) |
| 2 | URL-Based Offline Share | Complete | 4h | [phase-02-url-based-offline-share.md](./phase-02-url-based-offline-share.md) |
| 3 | Account Upgrade Flow | Complete | 2h | [phase-03](./phase-03-account-upgrade-flow.md) |
| 4 | Polish & Testing | Complete | 1h | [phase-04](./phase-04-polish-and-testing.md) |

## Dependencies

- Phase 1 must complete first (types + storage foundation)
- Phase 2 depends on Phase 1 (auth mode awareness in share UI)
- Phase 3 depends on Phase 1 (offline→online migration)
- Phase 4 depends on all previous phases

## Key Constraints

- Existing online users must NOT be affected
- Same crypto primitives (Argon2id, AES-256-GCM, HKDF)
- No new packages required
- URL share limit: ~2KB (hard limit + warning)
- Extension size: 380x520px (fixed)
