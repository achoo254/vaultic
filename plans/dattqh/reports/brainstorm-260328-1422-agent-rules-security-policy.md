# Brainstorm: Agent Rules & Security Policy for AI-Only Development

**Date:** 2026-03-28
**Context:** Vaultic is 100% developed by Claude Code Agent. Need comprehensive rules so agent understands codebase, follows patterns, and handles security correctly every session.

---

## Problem Statement

Three recurring pain points in AI-agent-only development:

1. **Context amnesia** — Agent forgets codebase structure, creates new files instead of editing existing, implements wrong patterns
2. **Code inconsistency** — Style/naming/patterns differ across sessions, doesn't follow design tokens
3. **Security gaps** — Hardcoded values, weak crypto choices, missing validation, secrets leakage risk

Root cause: Agent has no "institutional memory" — each session starts fresh with only CLAUDE.md context.

---

## Requirements

| Requirement | Decision |
|-------------|----------|
| Rules location | Project-only (`./docs/` + `CLAUDE.md`) — portable with repo |
| Security level | **Paranoid** — zero-trust for secrets, mandatory validation |
| Crypto access | Full access but MUST follow crypto rules |
| Security audit | Auto for sensitive modules (auth, crypto, sync, share) |
| Context loading | **Mandatory scout** — read CLAUDE.md + docs/ before any implementation |

---

## Evaluated Approaches

### A: Layered Docs ✅ CHOSEN

3 layers: CLAUDE.md (quick ref) → docs/agent-rules.md (detailed) → docs/security-policy.md (crypto+secrets)

**Pros:**
- Right information at right time — no context waste
- CLAUDE.md always loaded (~200 lines), docs/ read on-demand
- Separation of concerns: general rules vs security-specific
- Easy to maintain — each doc has clear scope

**Cons:**
- Agent might skip reading docs/ if not enforced
- Mitigation: CLAUDE.md contains "MUST READ" directive with list of trigger conditions

### B: Mega CLAUDE.md ❌ REJECTED

All rules in one 500+ line CLAUDE.md.

- Wastes ~2K tokens on every session even for simple UI tasks
- Hard to maintain — becomes a wall of text
- No separation between critical and nice-to-have rules

### C: Rule Tags in Code ❌ REJECTED

Rules as comments in code files.

- Scattered, impossible to maintain consistently
- Agent might not read file headers
- Duplicated rules across files

---

## Final Solution: 3-Layer Architecture

### Layer 1: CLAUDE.md (~200 lines, always loaded)

**Purpose:** Quick reference + enforcement directives

**Content:**
- Project overview, tech stack, architecture summary (existing — keep)
- **NEW Section: Agent Protocol** (top 10 critical rules):
  1. MUST read `docs/agent-rules.md` before ANY implementation
  2. MUST read `docs/security-policy.md` before touching sensitive modules
  3. Sensitive modules list: `backend/src/services/auth-service.ts`, `client/packages/crypto/`, `backend/src/middleware/auth-middleware.ts`, `backend/src/routes/share-route.ts`, `client/apps/extension/src/stores/auth-store.ts`, `client/apps/extension/src/lib/share-crypto.ts`
  4. NEVER create new files if existing file serves same purpose — edit existing
  5. NEVER hardcode secrets, URLs, credentials — use env vars
  6. ALL UI MUST use design tokens from `@vaultic/ui` — never hardcode colors/fonts/spacing
  7. File size limit: 200 lines — modularize if exceeding
  8. Follow existing patterns — grep for similar code before implementing
  9. Run `tsc --noEmit` after modifying TypeScript files
  10. Conventional commits only — no AI references

### Layer 2: docs/agent-rules.md (~300 lines)

**Purpose:** Detailed implementation rules, patterns, anti-patterns

**Sections:**
1. **Context Loading Protocol** — what to read and when
2. **Code Patterns** (with examples):
   - Backend: route → service → model pattern
   - Frontend: component structure, hooks, store patterns
   - Shared: type definitions in `shared/types/`
3. **Anti-Patterns** (DO NOT list with rationale):
   - DO NOT create `*-enhanced.ts`, `*-v2.ts`, `*-new.ts` files
   - DO NOT add `console.log` for debugging (use proper logger)
   - DO NOT use `any` type — always type properly
   - DO NOT mock in integration tests
   - DO NOT import from relative paths across packages — use `@vaultic/*`
4. **Module Ownership** — which package owns what concern
5. **Testing Requirements**:
   - Unit tests for services and crypto
   - Integration tests for API routes
   - Type-check before commit
6. **Review Protocol**:
   - Code-reviewer agent MUST check after implementation
   - Security audit for sensitive modules (auto-triggered)
7. **Design System Compliance**:
   - ALL colors from `tokens.colors.*`
   - ALL fonts from `tokens.font.*`
   - ALL spacing from `tokens.spacing.*`
   - ALL icons from `lucide-react` with `strokeWidth={1.5}`
   - Extension size: 380x520px fixed

### Layer 3: docs/security-policy.md (~200 lines)

**Purpose:** Crypto, secrets, auth rules for paranoid-level security

**Sections:**
1. **Cryptography Rules**:
   - ONLY use WebCrypto API + `argon2-browser` — no custom crypto
   - AES-256-GCM with random IV for each encryption
   - Argon2id for password hashing (memory: 64MB, iterations: 3, parallelism: 1)
   - HKDF for key derivation — per-purpose keys
   - NEVER store plaintext master password/keys in memory longer than needed
   - NEVER log encryption keys, IVs, or plaintext data
2. **Secrets Management**:
   - `.env` files: NEVER commit, always use `.env.example` with placeholder values
   - JWT_SECRET: minimum 256-bit random, rotated periodically
   - MONGODB_URI: never hardcode, always from env
   - API keys: env vars only, never in code/comments/docs
   - Docker: use env vars, not build-time secrets
3. **Authentication & Authorization**:
   - bcrypt with 10+ salt rounds for password hashing
   - JWT: access token 15min, refresh token 7d, HS256
   - Tokens in httpOnly cookies (backend) + memory-only (extension)
   - Rate limiting: 100 req/min on auth endpoints
   - Input validation on ALL user input (email format, password length, etc.)
4. **Data Protection**:
   - Zero-knowledge: server NEVER sees plaintext vault data
   - Client-side encryption BEFORE any network request
   - Share links: encrypted data in URL fragment (not sent to server)
   - Purge option: user can delete all server data
5. **Security Audit Checklist** (for sensitive module changes):
   - [ ] No hardcoded secrets/credentials
   - [ ] Input validation on all user inputs
   - [ ] SQL/NoSQL injection prevention (parameterized queries)
   - [ ] XSS prevention (no dangerouslySetInnerHTML, sanitize output)
   - [ ] CSRF protection (SameSite cookies, CORS)
   - [ ] Proper error handling (no stack traces to client)
   - [ ] Encryption uses random nonces/IVs
   - [ ] No plaintext sensitive data in logs
   - [ ] Rate limiting on sensitive endpoints
   - [ ] JWT validation on all protected routes

---

## Implementation Considerations

1. **CLAUDE.md update** — Keep existing content, add "Agent Protocol" section at top. Trim redundant info to stay under 200 lines.
2. **agent-rules.md** — New file. Include concrete code examples for each pattern (copy from existing codebase).
3. **security-policy.md** — New file. Extract security info from code-standards.md and system-architecture.md, consolidate + enhance.
4. **Cross-references** — Each doc references the others when relevant.
5. **Maintenance** — docs-manager agent updates these when codebase changes.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Agent skips reading docs/ | CLAUDE.md has mandatory directive + /cook workflow enforces scout step |
| Rules become outdated | docs-manager agent updates after each feature implementation |
| Rules too restrictive, slows development | Start strict, loosen based on experience. UI-only changes skip security audit |
| Context window bloat from reading all docs | Layered approach — only read what's needed for current task |

---

## Success Metrics

1. Agent follows existing patterns (no new `*-v2.ts` files)
2. Zero hardcoded secrets in committed code
3. Consistent use of design tokens across all components
4. Security audit passes for all sensitive module changes
5. Agent reads docs/ before implementation (observable in session logs)

---

## Next Steps

1. Create `docs/agent-rules.md` with detailed patterns and anti-patterns
2. Create `docs/security-policy.md` with crypto and secrets rules
3. Update `CLAUDE.md` — add Agent Protocol section, trim to ~200 lines
4. Update `docs/code-standards.md` — add cross-references to new docs
