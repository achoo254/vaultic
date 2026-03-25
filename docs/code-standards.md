# Vaultic: Code Standards & Structure

## Directory Structure

```
vaultic/
├── crates/
│   ├── vaultic-crypto/
│   │   ├── src/
│   │   │   ├── lib.rs           # Public API exports
│   │   │   ├── cipher.rs        # AES-256-GCM encryption
│   │   │   ├── kdf.rs           # Argon2id + HKDF
│   │   │   └── password_gen.rs  # Secure password generation
│   │   └── Cargo.toml
│   ├── vaultic-types/
│   │   ├── src/
│   │   │   ├── lib.rs           # Type exports
│   │   │   ├── user.rs          # User, Auth models
│   │   │   ├── vault.rs         # VaultItem, Vault models
│   │   │   ├── sync.rs          # Delta, Device, SyncState
│   │   │   └── share.rs         # ShareLink, ShareKey models
│   │   └── Cargo.toml
│   ├── vaultic-server/
│   │   ├── src/
│   │   │   ├── main.rs          # Axum server setup
│   │   │   ├── routes/          # API endpoint handlers
│   │   │   ├── db/              # Database queries
│   │   │   ├── middleware/      # Auth, CORS, logging
│   │   │   └── error.rs         # Error types
│   │   └── Cargo.toml
│   └── vaultic-migration/
│       ├── src/
│       │   └── lib.rs           # SeaORM migrations
│       └── Cargo.toml
├── packages/
│   ├── types/                   # TS types (mirror of vaultic-types)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   ├── vault.ts
│   │   │   ├── sync.ts
│   │   │   ├── share.ts
│   │   │   └── crypto.ts
│   │   └── package.json
│   ├── crypto/                  # WebCrypto + argon2-browser
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── cipher.ts        # AES-256-GCM in TS
│   │   │   ├── kdf.ts           # Argon2id + HKDF in TS
│   │   │   └── password-gen.ts
│   │   └── package.json
│   ├── storage/                 # VaultStore abstraction
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── vault-store.ts   # Interface
│   │   │   ├── indexeddb-store.ts
│   │   │   ├── memory-store.ts  # Testing
│   │   │   └── sync-queue.ts
│   │   └── package.json
│   ├── sync/                    # Sync engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── sync-engine.ts
│   │   │   ├── conflict-resolver.ts
│   │   │   └── device.ts
│   │   └── package.json
│   ├── api/                     # API client (ofetch)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts        # Base HTTP client
│   │   │   ├── auth-api.ts      # /auth/* endpoints
│   │   │   ├── sync-api.ts      # /sync/* endpoints
│   │   │   └── share-api.ts     # /share/* endpoints
│   │   └── package.json
│   ├── ui/                      # React components + tokens
│   │   ├── src/
│   │   │   ├── index.ts         # Component exports
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── ...
│   │   │   └── styles/
│   │   │       └── design-tokens.ts  # SINGLE SOURCE OF TRUTH
│   │   └── package.json
│   └── extension/               # WXT browser extension
│       ├── src/
│       │   ├── entrypoints/
│       │   │   ├── popup/       # 380x520px popup UI
│       │   │   │   ├── index.html
│       │   │   │   ├── main.tsx
│       │   │   │   └── app.tsx
│       │   │   └── background.ts  # Service worker
│       │   ├── content-scripts/ # Form detection (Phase 6)
│       │   └── assets/
│       │       └── styles.css
│       ├── wxt.config.ts
│       └── package.json
├── docker/
│   ├── Dockerfile              # Multi-stage: build stage + runtime
│   └── docker-compose.yml      # PostgreSQL 16 + vaultic-server
├── .gitlab-ci.yml              # CI/CD pipeline
├── Cargo.toml                  # Workspace root
├── package.json                # pnpm workspace root
├── turbo.json                  # Turborepo config
├── tsconfig.base.json          # Base TS config
└── docs/                       # Documentation (this folder)
```

---

## Naming Conventions

### Rust
- **Crates:** snake_case (`vaultic_crypto`, `vaultic_server`)
- **Modules:** snake_case (`cipher.rs`, `kdf.rs`)
- **Types/Structs:** PascalCase (`User`, `VaultItem`, `SyncDelta`)
- **Functions:** snake_case (`encrypt_item`, `derive_key`)
- **Constants:** SCREAMING_SNAKE_CASE (`ARGON2_MEMORY_COST`)

### TypeScript/JavaScript
- **Packages:** kebab-case within scope (`@vaultic/crypto`, `@vaultic/storage`)
- **Files (code):** kebab-case or PascalCase based on exports
  - **Interfaces/Classes:** PascalCase in filenames (`User.ts`, `VaultStore.ts`)
  - **Utilities:** kebab-case (`conflict-resolver.ts`, `sync-engine.ts`)
- **Types/Interfaces:** PascalCase (`User`, `VaultItem`, `SyncDelta`)
- **Functions:** camelCase (`encryptItem()`, `deriveKey()`)
- **Constants:** SCREAMING_SNAKE_CASE or camelCase (readonly) based on use
- **File size:** Keep under 200 lines; split larger modules

---

## Rust Code Standards

### Module Organization
```rust
// lib.rs: Clean public API
pub mod cipher;
pub mod kdf;
pub mod password_gen;

pub use cipher::{encrypt, decrypt};
pub use kdf::derive_key;
```

### Error Handling
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Invalid key length: expected {expected}, got {actual}")]
    InvalidKeyLength { expected: usize, actual: usize },
}

pub type Result<T> = std::result::Result<T, CryptoError>;
```

### Type Definitions
- Use `serde` for serialization: `#[derive(Serialize, Deserialize)]`
- Export shared types from `vaultic-types` crate
- Keep types in `types.rs` or dedicated modules

### Testing
```bash
# Run all tests
cargo test --workspace

# Test single crate
cargo test -p vaultic-crypto

# Run with logs (debug)
RUST_LOG=debug cargo test --lib -- --nocapture
```

### Linting & Formatting
```bash
cargo fmt --check           # Check formatting
cargo fmt                   # Auto-format
cargo clippy --all-targets  # Lint
```

**Principles:**
- No warnings allowed in CI/CD
- Use `#[allow(...)]` sparingly, with comments
- Prefer compiler guidance over manual style rules

---

## TypeScript Code Standards

### Type Definitions
```typescript
// Always explicit types, never use 'any'
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

type VaultItemType = 'password' | 'note' | 'card' | 'identity';

export class VaultStore {
  async getItem(id: string): Promise<VaultItem> { ... }
}
```

### Error Handling
```typescript
// Use explicit error types
class VaultError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// In async functions
async function encryptVault(password: string) {
  try {
    // ...
  } catch (error) {
    if (error instanceof Error) {
      throw new VaultError(`Encryption failed: ${error.message}`, 'ENC_FAILED');
    }
    throw error;
  }
}
```

### Async/Await Patterns
```typescript
// Prefer async/await over .then()
async function syncVault() {
  try {
    const deltas = await fetchDeltas();
    await applyDeltas(deltas);
  } catch (error) {
    logger.error('Sync failed', error);
  }
}
```

### Design Tokens (MANDATORY)
**ALL UI must use tokens from `packages/ui/src/styles/design-tokens.ts`:**

```typescript
// ❌ DON'T
const Button = styled.button`
  background-color: #2563EB;
  padding: 8px 16px;
`;

// ✅ DO
import { colors, spacing } from '@vaultic/ui/styles/design-tokens';

const Button = styled.button`
  background-color: ${colors.primary};
  padding: ${spacing.sm} ${spacing.md};
`;
```

### Testing
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Filter by package
pnpm --filter @vaultic/crypto test

# Coverage
pnpm test --coverage
```

### Linting
```bash
pnpm lint                        # Check all packages
pnpm --filter @vaultic/crypto lint  # Lint single package
```

**ESLint Config:**
- `@typescript-eslint/recommended`
- No unused variables
- No implicit any
- Consistent import ordering

---

## Build Commands

### Rust
```bash
# Build all crates
cargo build --release

# Build single crate
cargo build -p vaultic-crypto --release

# Check (faster than build)
cargo check --workspace
```

### TypeScript
```bash
# Build all packages (Turbo caching)
pnpm build

# Build single package
pnpm --filter @vaultic/crypto build

# Dev (watch mode, all packages)
pnpm dev

# Dev single package
pnpm --filter @vaultic/extension dev
```

---

## API Contract Standards

### Request/Response Format
All endpoints return JSON with consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Or on error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials"
  }
}
```

### Auth Endpoints
- `POST /auth/register` — Email + master password → JWT token
- `POST /auth/login` — Email + master password → JWT token
- `POST /auth/refresh` — Refresh token → New JWT
- `POST /auth/logout` — Invalidate token
- `GET /auth/me` — Current user profile (requires Bearer token)

### Sync Endpoints
- `POST /sync/pull` — Fetch deltas since last sync
- `POST /sync/push` — Send encrypted vault deltas
- `GET /sync/status` — Sync state check

### Share Endpoints
- `POST /share/create` — Generate encrypted share link
- `GET /share/:link_id` — Download encrypted item
- `DELETE /share/:link_id` — Revoke share link

### Auth Header
```
Authorization: Bearer <jwt_token>
```

All sensitive endpoints require Bearer token. CORS restricted to extension origin.

---

## Database Standards

### Models (SeaORM)
```rust
// Define entities in migrations or sea-orm entity files
pub struct Model {
    pub id: i32,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime,
}
```

### Migrations
- One migration file per feature
- Name: `m<YYYYMMDD>_<HHMMSS>_<feature_name>.rs`
- Migrations are reversible (up/down)
- Never alter production schema without migration

### Query Patterns
```rust
// Always use parameterized queries
let user = User::find_by_id(user_id).one(db).await?;

// Avoid raw SQL; use entity methods
let items = VaultItem::find()
    .filter(vault_item::Column::UserId.eq(user_id))
    .all(db)
    .await?;
```

---

## Security Standards

### Password Hashing
- Use Argon2id with:
  - Memory: 64 MiB
  - Time cost: 2
  - Parallelism: 4
  - Hash length: 32 bytes

### Encryption Keys
- Never log keys (only hashes)
- Use secure random for salt/IV (getrandom crate)
- HKDF for key derivation (multi-purpose keys)
- Keys in memory: clear after use (zeroize crate)

### API Security
- CORS: Restrict to extension/frontend origin
- HTTPS only in production (enforced at nginx)
- Rate limiting: 100 req/min per IP on `/auth/*`
- CSRF tokens if adding web UI later

### Secrets Management
- `.env` file: LOCAL ONLY (never commit)
- Use `.env.example` for required variables
- CI/CD: GitLab CI secrets (masked in logs)
- Production: Environment variables or secrets manager

---

## Testing Standards

### Unit Tests (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = generate_key().unwrap();
        let plaintext = b"test data";

        let ciphertext = encrypt(plaintext, &key).unwrap();
        let decrypted = decrypt(&ciphertext, &key).unwrap();

        assert_eq!(plaintext, &decrypted[..]);
    }
}
```

### Unit Tests (TypeScript)
```typescript
import { describe, it, expect } from 'vitest';
import { encryptItem } from '@vaultic/crypto';

describe('encryptItem', () => {
  it('should encrypt and decrypt correctly', async () => {
    const key = await deriveKey('password');
    const plaintext = { username: 'user' };

    const ciphertext = await encryptItem(plaintext, key);
    const decrypted = await decryptItem(ciphertext, key);

    expect(decrypted).toEqual(plaintext);
  });
});
```

### Coverage Requirements
- Minimum 70% line coverage for new code
- 100% coverage for crypto modules
- Integration tests for sync/conflict resolution

---

## Git & Commit Standards

### Branch Naming
- Feature: `feature/vault-crud`, `feature/autofill`
- Bug: `fix/sync-conflict`, `fix/auth-token-leak`
- Docs: `docs/api-documentation`
- Chore: `chore/upgrade-deps`

### Commit Messages (Conventional Commits)
```
feat: add vault item encryption
fix: resolve sync conflict on multi-device update
docs: update API endpoint documentation
test: add crypto roundtrip tests
chore: upgrade tokio to 1.35
refactor: extract password-gen into separate module
```

### Pre-commit Checks (Recommended)
```bash
# Before git push:
cargo fmt --check && cargo clippy --all-targets
pnpm lint && pnpm test
```

---

## Code Review Checklist

- [ ] Code compiles/builds without warnings
- [ ] Tests pass (Rust: `cargo test`, TS: `pnpm test`)
- [ ] Linting passes (`cargo clippy`, `pnpm lint`)
- [ ] Type safety: no `any` types, all types explicit
- [ ] Error handling: no unwraps in production code
- [ ] Security: no hardcoded secrets, proper HTTPS/auth
- [ ] Documentation: public API has doc comments
- [ ] Design tokens used (UI code only)
- [ ] Commit messages follow conventional format

---

## Documentation Standards

### Code Comments
```rust
/// Encrypts a vault item using AES-256-GCM.
///
/// # Arguments
/// * `item` - The vault item to encrypt
/// * `key` - The encryption key (32 bytes)
///
/// # Returns
/// Encrypted blob with nonce prepended
pub fn encrypt_item(item: &VaultItem, key: &[u8; 32]) -> Result<Vec<u8>> {
```

### README.md (per package)
- Purpose (1 line)
- Quick usage example
- Build/test commands
- Links to main docs

### Markdown Documentation
- Keep files under 800 lines
- Use headers for organization (H2–H4)
- Include code examples
- Link to related docs

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Vault search | <200ms | 10K items |
| Form auto-fill | <1s | Content script injection + DOM scan |
| Sync (push) | <2s | 100 item deltas |
| Sync (pull) | <2s | Decrypt + merge |
| Key derivation | <1s | Argon2id on weak CPU |

---

## File Size Limits

| Type | Limit | Action |
|------|-------|--------|
| Rust module | 500 lines | Split into submodules |
| TS file | 200 lines | Extract utilities/components |
| Markdown doc | 800 lines | Split into topic directories |

---

## Dependencies Management

### Principle: YAGNI (You Aren't Gonna Need It)
- Add dependencies only when actively needed
- Prefer std library (Rust) and native APIs (TS)
- Avoid bloat: review dependency tree (`cargo tree`, `pnpm audit`)

### Version Pinning
```toml
# Cargo.toml: Allow patch updates
tokio = "1.35"        # ✅ Auto-patch 1.35.x

# Avoid these patterns
tokio = "*"           # ❌ Unbounded
tokio = "~1.35.0"     # ❌ Too restrictive
```

### Update Frequency
- Monthly: Run `cargo update` + `pnpm update`
- Security alerts: Immediate response
- Check breaking changes before merging

---

## Deployment Checklist

- [ ] All tests pass
- [ ] Linting passes
- [ ] No console.log / println! in production code
- [ ] Secrets not hardcoded (.env variables used)
- [ ] HTTPS enabled on API
- [ ] CORS correctly configured
- [ ] Database migrations tested
- [ ] Docker image builds successfully
- [ ] CI/CD pipeline green

---

*Document updated: 2026-03-25*
*Phase 1 Status: Complete*
