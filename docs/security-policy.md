# Security Policy — Vaultic Password Manager

**Security level: PARANOID.** This is a password manager — security is existential.

Core principles:
- **Zero-knowledge:** Server NEVER sees plaintext vault data
- **Zero-trust:** Assume every input is hostile, every output could leak
- **Defense in depth:** Multiple layers of protection, never rely on one

MUST read this document before modifying any sensitive module listed in `docs/agent-rules.md §1`.

---

## 1. Cryptography Rules

### Allowed Libraries
- **WebCrypto API** (`crypto.subtle`) — browser-native, FIPS-validated
- **argon2-browser** — WebAssembly Argon2id implementation
- **NO other crypto libraries.** No custom implementations. No third-party alternatives.

### Algorithms & Parameters
| Operation | Algorithm | Parameters |
|-----------|-----------|------------|
| Password → master key | Argon2id | memory: 64MB, iterations: 3, parallelism: 1 |
| Key derivation | HKDF-SHA256 | Per-purpose keys (enc, auth) |
| Vault item encryption | AES-256-GCM | Random 12-byte IV per operation |
| Random generation | `crypto.getRandomValues()` | NEVER `Math.random()` |

### Mandatory Rules
- **Random IV/nonce:** Every encryption MUST use a fresh random IV. Never reuse.
- **Nonce storage:** Prepend IV to ciphertext (standard pattern in `@vaultic/crypto`)
- **Verification test:** Same plaintext encrypted twice MUST produce different ciphertext
- **No downgrade:** NEVER substitute AES-256-GCM with weaker ciphers (AES-CBC, etc.)
- **No roll-your-own:** NEVER implement custom crypto algorithms

### Key Material Handling
- NEVER store master key or derived keys in `localStorage`
- NEVER log keys, IVs, nonces, or plaintext data
- NEVER serialize key material to JSON
- Master password: keep in memory ONLY during key derivation, clear immediately after
- Derived keys: hold in memory (Zustand store), clear on lock/logout

---

## 2. Secrets Management

### Environment Variables
- `.env` files: **NEVER commit** — `.gitignore` must include `*.env`, `.env.*`
- `.env.example`: placeholder values only (e.g., `JWT_SECRET=change-me-to-random-256-bit`)
- All secrets loaded via `process.env` — never hardcoded in source code

### Specific Secrets
| Secret | Source | Rule |
|--------|--------|------|
| `JWT_SECRET` | `process.env.JWT_SECRET` | Min 256-bit random string |
| `MONGODB_URI` | `process.env.MONGODB_URI` | Never in code/comments/docs |
| API keys/tokens | Environment variables | Never committed to git |

### Infrastructure
- **Docker:** Use `--env-file` or compose `env_file:` — NEVER bake secrets into image layers
- **CI/CD (GitLab):** Use masked CI/CD variables — never echo secrets in pipeline logs
- **Production:** Environment variables on host or secrets manager

### Agent Rule
- NEVER generate real secrets in code — always reference env vars
- NEVER include example values that look like real credentials
- Code review: grep for patterns like `password = "`, `secret = "`, `key = "` with string literals

---

## 3. Authentication & Authorization

### Password Hashing (Server-Side)
- Algorithm: bcrypt, 10+ salt rounds
- Constant-time comparison for verification
- NEVER log passwords or password hashes

### JWT Tokens
| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days |
| Payload | `{ userId, email, iat, exp }` |
| Storage (extension) | Memory only (Zustand store) |
| Storage (web) | httpOnly cookie |

- NEVER store JWT in `localStorage` — XSS attack vector
- Auth middleware: verify signature + expiry on every protected route
- Reject expired tokens immediately — no grace period

### Rate Limiting
- Auth endpoints (`/api/v1/auth/*`): 100 req/min per IP
- Failed login response: generic "Invalid credentials" — NEVER reveal if email exists

### Input Validation
| Field | Validation |
|-------|-----------|
| Email | Valid format, lowercase, trimmed |
| Password | 8-128 characters, no other restrictions |
| Share IDs | UUID format |
| Pagination | Positive integers, max 100 per page |
| Request body | Validate structure before processing |

### CORS & Transport
- CORS: restrict to known extension origins — NEVER use `*`
- HTTPS: required in production (nginx terminates TLS)
- SameSite cookies for CSRF protection

---

## 4. Data Protection

### Zero-Knowledge Architecture
1. Client encrypts vault items BEFORE any network request
2. Server stores only ciphertext blobs — cannot decrypt
3. Server has NO decryption keys — only client holds master key
4. Sync pushes/pulls encrypted `VaultItem` blobs only

### Share Links
- Encrypted data in URL fragment (`#key`) — fragment is NOT sent to server
- Server stores only metadata (share_id, max_views, ttl) — NOT the secret content
- One-time or limited-view access enforced server-side

### Data Lifecycle
- **Purge:** User can delete ALL server data via API — hard delete, not soft delete
- **Sync off:** User can disable sync and delete server copy
- **Logout/reset:** Clear all local data (IndexedDB + memory)

### Logging Safety
- NEVER log request bodies on auth/sync/share routes (may contain ciphertext)
- Error responses to client: generic messages only
- Detailed error info: server-side logs only, no stack traces to client
- Production: `LOG_LEVEL=warn` — no debug output

---

## 5. Security Audit Checklist

**Auto-triggered** when agent modifies any file listed in `docs/agent-rules.md §1` (Sensitive Modules).

Before committing changes to sensitive modules, verify ALL items:

### Secrets & Credentials
- [ ] No hardcoded secrets, credentials, or API keys in code
- [ ] No real values in `.env.example` or documentation
- [ ] Environment variables used for all configuration secrets

### Input & Output
- [ ] Input validation on ALL user-provided data
- [ ] NoSQL injection prevention — no `$` operators from user input in MongoDB queries
- [ ] XSS prevention — no `dangerouslySetInnerHTML`, all output sanitized
- [ ] Error responses contain no stack traces or internal state
- [ ] Login errors don't reveal whether email exists

### Cryptography
- [ ] Encryption uses random IV/nonce per operation
- [ ] `crypto.getRandomValues()` used — not `Math.random()`
- [ ] Key material not persisted to localStorage or disk
- [ ] No plaintext sensitive data in `console.log` or server logs
- [ ] Same plaintext → different ciphertext (nonce verification)

### Authentication
- [ ] JWT signature + expiry validated on all protected routes
- [ ] Rate limiting active on auth endpoints
- [ ] CORS restricted to known origins
- [ ] Tokens stored in memory only (not localStorage)

### Type Safety
- [ ] No `any` types in security-critical code
- [ ] All function parameters and return types explicitly typed
- [ ] Error paths handled — no uncaught promise rejections
