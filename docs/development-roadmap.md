# Vaultic: Development Roadmap

Strategic roadmap for post-MVP feature development. Prioritized by user value and technical feasibility.

---

## Current Status: v0.3.1 (Security Audit Fixes Complete)

**Release Date:** 2026-03-30
**Completion:** MVP (v0.1.0) + Backend migration (v0.2.0) + Security audit fixes (v0.3.1)
**User Base:** Beta — ready for individual users with enhanced security
**Stability:** Production-ready (18 security items fixed, all tests passing)
**Server:** Node.js 22 + Express 4 (migrated from Rust/Axum)
**Key improvements:** Token revocation, non-extractable keys, multi-account isolation, improved sync reliability

---

## v0.3.0: Mobile Apps (Q2-Q3 2026)

**Goal:** Extend to iOS & Android while sharing crypto/sync engine.

### iOS (React Native)
- [ ] Reuse `@vaultic/crypto`, `@vaultic/sync`, `@vaultic/api` packages
- [ ] Secure Enclave integration (biometric unlock)
- [ ] App Store deployment
- [ ] iCloud Keychain bridge (optional)
- **Effort:** 4-6 weeks | **Owner:** TBD

### Android (React Native)
- [ ] Reuse shared packages (same as iOS)
- [ ] Android Keystore integration
- [ ] Google Play Store deployment
- [ ] Biometric unlock support
- **Effort:** 4-6 weeks | **Owner:** TBD

### Shared Mobile Stack
- [ ] React Native setup (monorepo integration)
- [ ] Bottom tab navigation (vault, search, settings)
- [ ] Push notifications for sync status
- [ ] Offline mode (full sync at app launch)

### Success Criteria
- [ ] iOS & Android parity with extension
- [ ] Biometric unlock working
- [ ] Sync works across web + mobile
- [ ] Zero data loss in conflict scenarios

---

## v0.4.0: SRP & Advanced Auth (Q3 2026)

**Goal:** Implement Secure Remote Password protocol for stronger server interaction.

### SRP Protocol
- [ ] Replace simple password auth with SRP-6a
- [ ] Client derives session key (no password sent)
- [ ] Server validates without ever seeing password
- [ ] **Benefit:** Protects against server compromise
- **Effort:** 2 weeks | **Owner:** TBD

### WebAuthn Support
- [ ] FIDO2 / U2F key support
- [ ] Password + key required (2FA optional)
- [ ] Cross-device sync (keys tied to device)
- **Effort:** 1-2 weeks | **Owner:** TBD

### TOTP 2FA
- [ ] Time-based one-time passwords (RFC 6238)
- [ ] QR code generation + backup codes
- [ ] Optional enforcement per account
- **Effort:** 1 week | **Owner:** TBD

### Success Criteria
- [ ] SRP integration test passes
- [ ] WebAuthn flows work on major browsers
- [ ] TOTP generation & verification correct
- [ ] Zero regression in existing auth flow

---

## v1.0.0: Team Vaults & Collaboration (Q4 2026-Q1 2027)

**Goal:** Enable small teams to share encrypted vaults with fine-grained access control.

### Team Invite System
- [ ] Email invitations with expiry
- [ ] Role-based access (owner, editor, viewer)
- [ ] Revoke access (automatic key rotation)
- [ ] Audit log (who accessed what, when)
- **Effort:** 3 weeks | **Owner:** TBD

### Shared Vault Encryption
- [ ] Team encryption key (different from personal key)
- [ ] Client-side member key wrapping
- [ ] Add/remove members without re-encrypting vault
- [ ] Device trust (member devices approved by owner)
- **Effort:** 3 weeks | **Owner:** TBD

### UI Updates
- [ ] Vault switcher (personal + shared vaults)
- [ ] Member management page
- [ ] Access logs viewer
- [ ] Invite flow + onboarding
- **Effort:** 2 weeks | **Owner:** TBD

### Server Changes
- [ ] Teams table (ownership, created_at)
- [ ] Team members table (user_id, role, joined_at)
- [ ] Team vaults (owned by team, not user)
- [ ] Audit log table
- **Effort:** 2 weeks | **Owner:** TBD

### Success Criteria
- [ ] Teams created, members added, access revoked
- [ ] Shared vault sync works across team members
- [ ] Encryption keys rotate on member removal
- [ ] Audit logs complete and queryable
- [ ] No data leaks on member revocation

---

## v1.1.0: Enterprise Features (Q1 2027)

**Goal:** Support larger organizations with compliance & management tools.

### Admin Dashboard
- [ ] User management (create, suspend, delete)
- [ ] Audit logs (compliance exports)
- [ ] Security policies (password requirements, device trust)
- [ ] Usage analytics (storage, sync volume)
- **Effort:** 4 weeks | **Owner:** TBD

### SSO Integration
- [ ] SAML 2.0 support
- [ ] OAuth 2.0 (Google, Azure AD)
- [ ] Just-in-time provisioning
- **Effort:** 3 weeks | **Owner:** TBD

### Data Residency
- [ ] EU data center option (GDPR)
- [ ] On-premise deployment (Helm charts)
- [ ] IP whitelisting support
- **Effort:** 2 weeks | **Owner:** TBD

### DLP & Policy Enforcement
- [ ] Share restrictions (no external shares)
- [ ] Expiration policies (vaults expire in X days)
- [ ] Device approval workflow
- **Effort:** 2 weeks | **Owner:** TBD

### Success Criteria
- [ ] Admin dashboard fully functional
- [ ] SSO flows tested with major providers
- [ ] Helm deployment working (k8s)
- [ ] Compliance exports GDPR-compliant

---

## v2.0.0: Full Self-Hosting (Q2 2027)

**Goal:** Enable organizations to run Vaultic on their own infrastructure.

### Kubernetes Deployment
- [ ] Helm charts (easy install)
- [ ] Persistent volume support
- [ ] Horizontal scaling (multiple server instances)
- [ ] Database backup strategy
- **Effort:** 3 weeks | **Owner:** TBD

### Backup & Disaster Recovery
- [ ] Automated PostgreSQL backups
- [ ] Encryption key backup (escrow options)
- [ ] Point-in-time recovery (PITR)
- [ ] High availability (multi-region)
- **Effort:** 2 weeks | **Owner:** TBD

### Monitoring & Observability
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Structured logging (JSON format)
- [ ] Alert rules (disk space, sync lag)
- **Effort:** 2 weeks | **Owner:** TBD

### Container Registry
- [ ] Build & push to private registries
- [ ] Signed images (cosign)
- [ ] Security scanning (trivy)
- **Effort:** 1 week | **Owner:** TBD

### Success Criteria
- [ ] Helm chart installs & upgrades cleanly
- [ ] Backups automated + tested
- [ ] Monitoring alerts work
- [ ] Disaster recovery tested (restore successful)

---

## Deferred Features (Post-2027)

### AI-Assisted Password Auditing
- Analyze vault for weak/reused passwords
- Suggest generation + auto-update
- Breach detection (integration with HaveIBeenPwned)

### Passwordless Auth
- Passkeys (WebAuthn only, no passwords)
- Biometric-only unlock (no PIN fallback)

### API for Third-Party Integrations
- OAuth token for app integrations
- Webhook support (sync events, member changes)
- Official SDKs (Python, Go, Rust)

### Browser Plugins for Safari, Edge
- Safari extension (AppKit extension)
- Edge extension (Chromium-based)

### Password Strength Policies
- Custom regex patterns (org-specific requirements)
- Length/complexity enforcement
- Regular change policies

### Blockchain Features (Low Priority)
- Distributed key escrow (no longer needed post-v1.1)
- Proof-of-ownership attestation

---

## Tech Debt & Maintenance (Ongoing)

### Code Quality
- [ ] Increase test coverage to 85%+ (currently 70%)
- [ ] Add integration tests for Rust server
- [ ] Performance profiling (sync time optimization)
- [ ] Dependency updates (monthly)

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture decision records (ADRs)
- [ ] Deployment runbooks (per environment)
- [ ] Security white papers

### Infrastructure
- [ ] Cost optimization (CDN for static assets)
- [ ] DDoS protection (rate limiting, WAF)
- [ ] Disaster recovery drills (quarterly)
- [ ] Security audits (annual)

---

## Prioritization Matrix

| Feature | User Value | Effort | Timeline | Priority |
|---------|------------|--------|----------|----------|
| **Mobile Apps** | Very High | 6 weeks | Q2-Q3 | P0 |
| **SRP Auth** | High | 2 weeks | Q3 | P1 |
| **Team Vaults** | Very High | 8 weeks | Q4 | P0 |
| **SSO** | High | 3 weeks | Q1 2027 | P1 |
| **Self-Hosting** | Medium | 6 weeks | Q2 2027 | P2 |
| **Passwordless** | Medium | 4 weeks | Post-2027 | P3 |

---

## Risk Assessment & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **Encryption key mismanagement** | Critical | Low | Formal key escrow design review |
| **Sync conflicts in teams** | High | Medium | Extensive conflict testing |
| **Scale issues (10K+ users)** | High | Low | Load testing @ 50K concurrent |
| **Zero-day crypto weakness** | Critical | Low | Annual security audit |
| **Data loss on mobile** | High | Low | Backup sync to cloud on startup |

---

## Success Metrics (Post-MVP)

### User Adoption
- [ ] 10K active users by v1.0
- [ ] 50K by v1.1
- [ ] NPS score ≥40 by v1.0

### Product Quality
- [ ] <1% monthly churn
- [ ] 99.9% uptime SLA
- [ ] <2s median sync time
- [ ] Zero security incidents (reported)

### Business
- [ ] Sustainable business model (SaaS + enterprise)
- [ ] Break-even by v1.1
- [ ] Enterprise pilot customers (2-3 by Q1 2027)

---

## Stakeholder Communication

### Monthly Status Updates
- Progress on active phase
- Blockers & mitigations
- Next month priorities

### Quarterly Reviews
- Feature completion rate
- Quality metrics (tests, bugs, uptime)
- User feedback summary
- Budget/resource adjustments

### Annual Planning
- Roadmap adjustment (market feedback)
- New threat analysis (security)
- Technology refresh (dependency updates)

---

## References

- **MVP Plan:** `plans/dattqh/260324-2044-vaultic-mvp-implementation/plan.md`
- **Architecture:** `docs/system-architecture.md`
- **Security:** `docs/project-overview-pdr.md#security-considerations`
- **Deployment:** `docker/docker-compose.yml`

---

*Roadmap updated: 2026-03-26*
*MVP Status: ✅ Complete*
*Next milestone: v0.2.0 Mobile Apps (Q2-Q3 2026)*
