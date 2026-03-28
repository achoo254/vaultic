---
phase: 2
status: completed
priority: high
---

# Phase 2: Create `docs/security-policy.md`

## Overview

Paranoid-level security rules for a zero-knowledge password manager. Covers crypto implementation, secrets management, auth, data protection, and audit checklist. ~200 lines.

## Target File

`docs/security-policy.md`

## Content Structure

### 1. Preamble (~10 lines)
- This is a password manager — security is existential
- Zero-knowledge: server NEVER sees plaintext
- Paranoid level: assume every input is hostile, every output could leak
- MUST read this doc before touching any sensitive module

### 2. Cryptography Rules (~40 lines)
- ONLY use WebCrypto API + `argon2-browser` — NO custom crypto, NO third-party crypto libs
- AES-256-GCM: random 12-byte IV per encryption, never reuse
- Argon2id params: memory 64MB, iterations 3, parallelism 1 (from existing crypto package)
- HKDF-SHA256: derive per-purpose keys (enc key, auth key)
- Key material: NEVER store in localStorage, NEVER log, NEVER serialize to JSON
- Master password: keep in memory only during key derivation, clear after
- Random generation: ONLY `crypto.getRandomValues()` — never `Math.random()`
- Nonce/IV: MUST be unique per operation — concatenate or prepend to ciphertext
- NEVER implement "roll your own" crypto algorithms
- NEVER downgrade from AES-256-GCM to weaker ciphers
- Test: every encryption MUST produce different ciphertext for same plaintext (random nonce verification)

### 3. Secrets Management (~30 lines)
- `.env` files: NEVER commit — `.gitignore` must include `*.env`, `.env.*`
- `.env.example`: placeholder values only — `JWT_SECRET=change-me-to-random-256-bit`
- JWT_SECRET: minimum 256-bit random string, never hardcode in code
- MONGODB_URI: always from `process.env`, never in code/comments/docs
- API keys/tokens: environment variables only
- Docker: use `--env-file` or compose env, NEVER bake secrets into image layers
- CI/CD (GitLab): use masked CI/CD variables, never echo secrets in logs
- Agent rule: NEVER generate real secrets in code — always use env var references
- Code review: grep for potential secret patterns (`password =`, `secret =`, `key =` with string values)

### 4. Authentication & Authorization (~40 lines)
- Password hashing: bcrypt with 10+ salt rounds (server-side for auth)
- JWT structure: `{ userId, email, iat, exp }`
- Access token: 15 min TTL, refresh token: 7 days
- Token storage: httpOnly cookie (backend web) or memory-only (extension)
- NEVER store JWT in localStorage — XSS risk
- Auth middleware: verify token on every protected route, reject expired
- Rate limiting: 100 req/min on `/api/v1/auth/*` endpoints
- Failed login: generic error "Invalid credentials" — never reveal if email exists
- Input validation on ALL endpoints:
  - Email: valid format, lowercase, trimmed
  - Password: 8-128 chars, no further restrictions (let users choose)
  - Share IDs: UUID format validation
  - Pagination: positive integers, max 100 per page
- CORS: restrict to known extension origins, not `*`
- HTTPS: required in production (nginx terminates TLS)

### 5. Data Protection (~30 lines)
- Zero-knowledge architecture:
  - Client encrypts vault items BEFORE any network request
  - Server stores only ciphertext blobs
  - Server cannot decrypt — no decryption keys on server
- Share links: encrypted data in URL fragment (`#key`) — fragment NOT sent to server
- Sync: push/pull only encrypted `VaultItem` blobs
- Purge: user can delete ALL server data via API — hard delete, not soft
- Logging: NEVER log request bodies on auth/sync/share routes (may contain ciphertext)
- Error responses: generic messages to client, detailed logs server-side only
- No stack traces in production responses
- IndexedDB: encrypted vault items stored locally, clearable on logout/reset

### 6. Security Audit Checklist (~40 lines)
Auto-triggered when agent modifies these modules:
- `backend/src/services/auth-service.ts`
- `backend/src/middleware/auth-middleware.ts`
- `backend/src/routes/share-route.ts`
- `backend/src/routes/sync-route.ts`
- `client/packages/crypto/src/**`
- `client/apps/extension/src/stores/auth-store.ts`
- `client/apps/extension/src/lib/share-crypto.ts`
- `client/apps/extension/src/lib/fetch-with-auth.ts`

Checklist items:
- [ ] No hardcoded secrets, credentials, or API keys
- [ ] Input validation on all user-provided data
- [ ] NoSQL injection prevention (no `$` operators from user input)
- [ ] XSS prevention (no `dangerouslySetInnerHTML`, sanitize output)
- [ ] CSRF protection (SameSite cookies, CORS restrictions)
- [ ] Error handling: no stack traces or internal details to client
- [ ] Encryption uses random IV/nonce per operation
- [ ] No plaintext sensitive data in console.log or server logs
- [ ] Rate limiting active on auth endpoints
- [ ] JWT validation: signature + expiry checked
- [ ] Key material not persisted to disk/localStorage
- [ ] `crypto.getRandomValues()` used (not `Math.random()`)
- [ ] Response does not leak internal state (user exists, etc.)
- [ ] Type safety: no `any` types in security-critical code

## Success Criteria

- [x] File created at `docs/security-policy.md` (175 lines)
- [x] All 6 sections present
- [x] Crypto rules match existing `@vaultic/crypto` implementation
- [x] Checklist covers OWASP Top 10 relevant to this app
- [x] Under 200 lines
