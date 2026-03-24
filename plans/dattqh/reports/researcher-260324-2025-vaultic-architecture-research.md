# Vaultic Password Manager - Architecture Research Report
**Date:** 2026-03-24 | **Status:** Complete Research

---

## 1. BITWARDEN ARCHITECTURE - KEY DERIVATION & ENCRYPTION

### Key Derivation (Master Password → Encryption Key)
**Recommended:** Bitwarden supports two approaches; Argon2id is preferred per OWASP.

- **PBKDF2 SHA-256**: 600,000 iterations minimum (as of 2026.2.1 release)
- **Argon2id**: Winner of 2015 Password Hashing Competition; memory-hard, resistant to GPU attacks
- **HKDF**: Used for deriving additional keys from non-password material (other keys, random data)

**Action for Vaultic:** Start with Argon2id for MVP, allow PBKDF2 fallback for older clients. Use HKDF to derive separate keys for encryption and authentication.

### Vault Encryption/Decryption Flow
1. Master password → Key derivation (Argon2id) → Encryption key
2. Client-side encryption: AES-256-CBC (Bitwarden standard)
3. HMAC-SHA256 for integrity verification on encrypted data
4. All encryption/decryption happens on client; server only stores ciphertext

**Threat Model:** Server breach exposes only encrypted data; master password never transmitted.

### Sync Protocol
- Client encrypts vault items locally
- Sends encrypted payload to server
- Server stores blob without access to plaintext
- On sync: Client fetches encrypted data, decrypts locally
- Conflict resolution handled by timestamps

---

## 2. SRP PROTOCOL - ZERO-KNOWLEDGE AUTHENTICATION

### Why SRP?
1Password uses SRP to prevent password/secret key theft even if TLS is compromised. Protocol: neither password nor session key transmitted in cleartext.

**Flow:**
1. Client derives credentials from master password + secret key
2. Sends `clientPublic` to server (no password)
3. Server responds with `serverPublic` + challenge
4. Client proves knowledge via cryptographic handshake
5. Mutual authentication without password exposure

### For Vaultic MVP
**Verdict:** SRP is NOT overkill; it's industry standard for password managers. However:
- **Complexity:** Requires client + server implementation, careful nonce handling
- **Simpler Alternative (if needed):** OPAQUE (Augmented PAKE) or Basic Auth over TLS + rate limiting
  - Less mature in Rust ecosystem than SRP
  - Still zero-knowledge; avoids SRP complexity

**Recommendation:** Use SRP for production-grade security. Rust crate: `srp` (available but less battle-tested than Go version).

---

## 3. TAURI + BROWSER EXTENSION MONOREPO STRUCTURE

### Recommended Monorepo Layout
```
vaultic/
├── packages/
│   ├── shared-crypto/           # Rust crate for encryption logic
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── kdf.rs           # Argon2 key derivation
│   │   │   ├── cipher.rs        # AES-256-GCM encryption
│   │   │   └── lib.rs
│   │   └── Cargo.feature (wasm)  # WASM target for browser
│   ├── shared-ui/               # React components (sharable)
│   │   ├── package.json
│   │   ├── src/components/
│   │   │   ├── VaultForm.tsx
│   │   │   ├── PasswordInput.tsx
│   │   │   └── Sidebar.tsx
│   │   └── tsconfig.json
│   ├── core-api/                # Axum API server (Rust)
│   │   ├── Cargo.toml
│   │   ├── src/main.rs
│   │   └── migrations/
│   ├── desktop-app/             # Tauri app
│   │   ├── src-tauri/
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   └── src/
│   │       └── (React frontend)
│   └── extension/               # WXT browser extension
│       ├── package.json
│       ├── wxt.config.ts
│       ├── src/
│       │   ├── popup.tsx        # Extension popup
│       │   ├── content.tsx      # Content script
│       │   └── background.ts    # Service worker
│       └── tsconfig.json
└── Cargo.workspace              # Rust workspace root

```

### Code Sharing Strategy

**Crypto Logic:** Share via Rust crate + WASM
- Desktop (Tauri): Use native Rust `shared-crypto` directly
- Extension: Compile `shared-crypto` to WASM (via `wasm-bindgen`), use from TS
- Both import same business logic, zero duplication

**UI Components:** React only (TypeScript)
- Both Tauri webview and Extension UI import from `shared-ui`
- Use conditional imports for platform-specific behavior (file access, etc.)

**API Client:** Shared TypeScript
- Single HTTP client for both Tauri and Extension
- Version negotiation handled by server

---

## 4. WXT FRAMEWORK FOR BROWSER EXTENSIONS

### Why WXT?
- **2025 Consensus:** WXT is the superior choice for new extensions (surpassed Plasmo, CRXJS)
- **Vite-based:** HMR for fast iteration; compiles to Manifest V3 for Chrome/Firefox
- **React Native:** Direct React support via `@wxt-dev/module-react`
- **One codebase, multiple browsers:** Chrome/Firefox builds from single source

### Setup for Vaultic
```bash
npm create wxt@latest vaultic-extension
# Choose React + TypeScript
```

Config (`wxt.config.ts`):
```typescript
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>']
  }
})
```

**Key Files:**
- `src/popup.tsx` → Extension icon click → UI
- `src/content.tsx` → Page injection → Auto-fill
- `src/background.ts` → Service worker → Sync, notifications

---

## 5. RUST CRATES FOR PASSWORD MANAGER

### Encryption: AES-256-GCM
**Comparison:**
| Crate | Type | Audit | Hardware Accel | Recommendation |
|-------|------|-------|----------------|---|
| `aes-gcm` | Pure Rust | NCC Group ✓ | Optional (AES-NI) | **CHOOSE THIS** |
| `ring` | Hybrid (Rust/C/Asm) | ✓ | Yes | Alternative (lower-level) |
| `orion` | Pure Rust | None | No | Simple but slower |

**Action:** Use `aes-gcm` (audited, constant-time, hardware accel optional).

**Alternative:** XChaCha20-Poly1305 (faster without hardware, immune to cache-timing).

### Key Derivation: Argon2
**Crates:**
- `argon2` (12.1M+ downloads): Pure Rust, recommended, supports Argon2d/i/id
- `rust-argon2`: Older, less maintained

**Action:** Use `argon2` crate (modern, pure Rust, ~12.1M downloads).

### SRP Implementation
- **Crate:** `srp` (available on crates.io)
- **Status:** Functional but less battle-tested than 1Password's Go version
- **Note:** Requires careful implementation; consider SRP library audit before production

### API Server: Axum
**vs Actix-web (2025 Analysis):**
| Factor | Axum | Actix-web |
|--------|------|-----------|
| Performance | Good (slightly heavier) | ~10% faster at extreme load |
| Learning Curve | Easier (standard Rust patterns) | Actor model adds complexity |
| Adoption | Higher (Tokio-backed) | Declining |
| Middleware | Tower ecosystem | Built-in (mature) |
| Best For | New projects, teams wanting composability | Teams with actor model expertise |

**Action:** Use Axum (recommended for new projects; Tower middleware aligns with Rust ecosystem).

### Database: SeaORM vs SQLx
**2025 Verdict:** SeaORM 1.0 is now enterprise-ready; SQLx better for control.

| Factor | SeaORM | SQLx |
|--------|--------|------|
| Paradigm | ActiveRecord (Rails-like) | Raw SQL + compile-time checks |
| Async | Native | Native |
| Development Speed | 3x faster (less boilerplate) | More control, more code |
| Compile-time Safety | Model-based | Macro-based (query! macro) |
| Best For | Rapid CRUD, schema migrations | Performance-critical, raw SQL |

**Action:** Use SeaORM for MVP (faster development, built-in migrations, async-first).

---

## 6. MVP SCOPE FOR EXTENSION-FIRST PASSWORD MANAGER

### Must-Have (Core)
1. **Vault Storage**
   - Add/edit/delete password entries
   - Fields: URL, username, password, notes
   - Local encryption (client-side, Argon2 + AES-256-GCM)

2. **Extension UI**
   - Popup for search/quick add
   - Auto-fill on login forms
   - Master password prompt on first use

3. **Account Management**
   - Registration + login (SRP or TLS + rate-limit)
   - Master password setup
   - Logout

4. **Sync**
   - Encrypted vault backup to server
   - Pull on app launch
   - Conflict resolution (last-write-wins)

5. **Security Basics**
   - Master password hashing (Argon2id)
   - No plaintext storage anywhere
   - Clear session timeout (15 min)

### Should-Have (Post-MVP)
- Password generator
- Form detection improvements
- Multiple vaults
- Sharing (encrypted)
- 2FA setup

### Won't-Have (v2+)
- Desktop/mobile apps (currently extension-focused)
- Advanced reporting
- Team management
- SSO

### Estimated Timeline
- MVP Phase: **6-8 weeks**
  - Weeks 1-2: Setup, crypto implementation
  - Weeks 3-4: Backend API + DB
  - Weeks 5-6: Extension UI + auto-fill
  - Weeks 7-8: Sync + testing
- Desktop Tauri app: **+4 weeks** (reuse crypto + API)

---

## 7. IMPLEMENTATION TECH STACK SUMMARY

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Crypto** | `aes-gcm` (AES-256-GCM) + `argon2` | Audited, pure Rust, industry standard |
| **KDF** | Argon2id (via `argon2` crate) | OWASP recommended, GPU-resistant |
| **Auth** | SRP (via `srp` crate) | Zero-knowledge, industry practice (1Password) |
| **API Server** | Axum (Tokio-based) | Modern, composable, growing adoption |
| **Database** | SeaORM + PostgreSQL | Async-first, rapid CRUD, migrations built-in |
| **Extension** | WXT + React + TypeScript | Single codebase, Manifest V3, best DX 2025 |
| **Desktop** | Tauri + same React UI | Share crypto + API, lightweight |
| **Monorepo** | Cargo workspace + npm workspaces | Rust crates + TS packages cleanly separated |

---

## 8. ARCHITECTURAL DECISION SUMMARY

### Crypto Separation (Avoid Duplication)
- **Tauri (Desktop):** Native Rust crate → Linking at compile time
- **Extension (Browser):** WASM build of same crate → Runtime JS binding
- **Both share:** Same business logic, zero divergence risk

### Sync Without Leaking Metadata
- Server stores encrypted vault blobs only
- Timestamps for conflict resolution
- Client determines merge strategy
- No ability to search server-side (privacy by design)

### Extension Auto-Fill Security
- Content script detects form fields
- Injects pre-filled values (not form submission interception)
- User confirms before submitting
- Reduces keylogger risk vs. clipboard paste

---

## UNRESOLVED QUESTIONS

1. **SRP Crate Maturity:** `srp` crate available but no production case studies found. Should MVP use basic Auth (TLS + rate-limit) or invest in SRP now? → Recommend: SRP from start; simpler than adding later.

2. **WASM Serialization:** How to efficiently serialize Argon2 output for TS? → Use hex encoding or base64; minimal overhead.

3. **Extension Permissions:** How minimal can we make permissions? Current draft requests `<all_urls>` for auto-fill. → Possible: Limit to registered sites only; requires permission prompt per-site.

4. **Offline Vault:** Should MVP support offline access? → Recommend: Always-online for MVP (sync complexity); offline as v2 feature.

---

## SOURCES

- [Bitwarden Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/)
- [Bitwarden KDF Algorithms](https://bitwarden.com/help/kdf-algorithms/)
- [1Password SRP Implementation](https://blog.1password.com/developers-how-we-use-srp-and-you-can-too/)
- [1Password SRP GitHub](https://github.com/1Password/srp)
- [aes-gcm Crate](https://crates.io/crates/aes-gcm)
- [RustCrypto/AEADs](https://github.com/RustCrypto/AEADs)
- [WXT Framework](https://wxt.dev/)
- [2025 Browser Extension Framework Analysis](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [WXT React Module](https://www.npmjs.com/package/@wxt-dev/module-react)
- [Tauri v2 Next.js Monorepo](https://melvinoostendorp.nl/blog/tauri-v2-nextjs-monorepo-guide/)
- [Argon2 Rust Crate](https://crates.io/crates/argon2)
- [Axum vs Actix-web 2026](https://aarambhdevhub.medium.com/rust-web-frameworks-in-2026-axum-vs-actix-web-vs-rocket-vs-warp-vs-salvo-which-one-should-you-2db3792c79a2)
- [SeaORM vs SQLx 2026](https://aarambhdevhub.medium.com/rust-orms-in-2026-diesel-vs-sqlx-vs-seaorm-vs-rusqlite-which-one-should-you-actually-use-706d0fe912f3)
- [SeaORM 1.0 Production Ready](https://techpreneurr.medium.com/seaorm-vs-sqlx-the-rust-orm-war-ends-with-seaorm-1-0-2026-production-ready-87e219ae6fab/)
