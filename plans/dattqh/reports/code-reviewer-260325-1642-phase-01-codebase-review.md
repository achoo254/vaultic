# Phase 1 Code Review: Project Setup & Monorepo

**Reviewer:** code-reviewer | **Date:** 2026-03-25 | **Scope:** Full Phase 1 codebase
**Files:** 55 source files | **LOC:** ~1,035 | **Focus:** Skeleton correctness, config, type alignment, security

## Summary

Solid Phase 1 skeleton. Cargo workspace compiles clean (zero clippy warnings). TS packages build successfully. Type mirroring between Rust and TS is good with minor alignment gaps. Architecture is well-modularized per the plan. A few issues need fixing: build artifacts tracked in git, `cargo fmt` failure, missing `.turbo/` in gitignore, and some type discrepancies between Rust/TS. Overall quality is high for a scaffold phase.

## Findings

### Critical (must fix)

**None.**

### Important (should fix)

1. **`.turbo/` build logs committed to git**
   7 turbo build log files are tracked: `packages/*/.turbo/turbo-build.log`. Add `.turbo/` to `.gitignore` and remove from tracking.
   ```bash
   echo ".turbo/" >> .gitignore
   git rm -r --cached packages/*/.turbo/
   ```

2. **`cargo fmt` check fails**
   `crates/vaultic-server/src/main.rs:16` — multiline chain on `Router::new().route(...)` doesn't match rustfmt output. Run `cargo fmt` to fix. CI will reject this.

3. **Rust VaultItem has `user_id` field, TS VaultItem does not**
   `crates/vaultic-types/src/vault.rs` has `user_id: Uuid` on both `VaultItem` and `Folder`.
   `packages/types/src/vault.ts` omits `user_id` from both. This is intentional (client doesn't need it) but should be documented with a comment explaining the deliberate omission, or it will confuse future implementers when syncing data shapes.

4. **Rust ItemType uses `serde(rename_all = "snake_case")` but TS uses string values**
   Rust: `Login` serializes to `"login"`, `SecureNote` to `"secure_note"`
   TS: `Login = 'login'`, `SecureNote = 'secure_note'`
   This is correctly aligned. No action needed.

5. **TS VaultItem `user_id` field present in `AuthResponse` but missing from `User` type on TS side**
   Rust `User` struct has `auth_hash`, `salt`, `created_at`, `updated_at` fields. TS `User` only has `id` and `email`. This is fine for client-side (auth_hash/salt should never be sent to client), but document the intentional difference.

6. **Extension `host_permissions: ['<all_urls>']` is overly broad**
   For MVP this is acceptable for autofill, but flag for Phase 6 review — Chrome Web Store reviews reject extensions with `<all_urls>` without strong justification. Consider narrowing or making it optional.

7. **`getDeviceId()` in `packages/sync/src/device.ts` silently fails if localStorage unavailable**
   If `globalThis.localStorage?.setItem(key, id)` fails (e.g., storage quota, private browsing), the function returns a new UUID every call — breaks sync device identity. Add error handling or fallback to `chrome.storage.local`.

### Minor (nice to have)

1. **Password generator has modulo bias**
   `packages/crypto/src/password-gen.ts:23` — `v % charset.length` introduces modulo bias when `charset.length` doesn't evenly divide `2^32`. For a password manager, use rejection sampling. Low urgency for Phase 1 skeleton but must fix before shipping.

2. **Wildcard re-exports in `vaultic-types/src/lib.rs`**
   `pub use share::*; pub use sync::*;` etc. can cause name collisions as types grow. Consider explicit re-exports (like vaultic-crypto does).

3. **No `tsconfig.json` references/paths for workspace packages**
   Each package's tsconfig extends base but doesn't use project references. This means `tsc --build` won't work for incremental builds. Turbo handles build order, but TS project references would give better IDE experience.

4. **UI components use inline styles instead of Tailwind/CSS**
   Plan mentions shadcn/ui + Tailwind, but `Button` and `Input` use React inline `CSSProperties`. This works for Phase 1 but won't scale — no hover states, no focus rings, no media queries. Tailwind + shadcn was planned.

5. **`packages/crypto/src/utils.ts` is in the plan but missing**
   Phase 1 plan lists `utils.ts` under crypto package. Not created. Minor since it's an empty skeleton anyway.

6. **Docker compose file named `docker-compose.yml` but plan says `docker-compose.dev.yml` and `docker-compose.prod.yml`**
   Single file is simpler for now (KISS), but doesn't match the plan's file structure. Either split or update the plan.

7. **`.env.example` has `JWT_SECRET=change-this-in-production`**
   The default value `change-this-in-production` is a common antipattern. Prefer empty value with comment: `JWT_SECRET=  # REQUIRED: set a strong random secret`.

8. **`LWWResolver.resolve()` compares ISO date strings directly**
   `remote.updated_at > local.updated_at` works for ISO 8601 strings, but only if both are in the same timezone format. Document that all timestamps must be UTC ISO 8601, or compare with `new Date()`.

9. **Missing `Cargo.lock` in `.gitignore` consideration**
   `Cargo.lock` IS committed (correct for a binary project). Just confirming this is intentional and correct.

10. **`repomix-output.xml` exists in repo root**
    Large generated file. Should be gitignored if not needed in version control.

### Positive (what's good)

1. **Clean Cargo workspace compilation** — zero warnings, zero clippy issues
2. **Correct `rustls` usage** — `sea-orm` features use `runtime-tokio-rustls`, no openssl-sys dependency
3. **Well-structured error types** — `CipherError`, `KdfError` with `thiserror` derive
4. **Smart interface design** — `VaultStore` and `SyncQueue` abstractions with `MemoryStore` for testing
5. **Proper workspace dependency management** — shared deps in `[workspace.dependencies]`
6. **Design tokens centralized** — single source of truth, `as const` for full type inference
7. **API client pattern** — `ofetch.create()` with token injection interceptor is clean
8. **Docker healthcheck** — `pg_isready` with proper retry config
9. **CI pipeline structure** — proper stage separation, cache configuration
10. **File naming follows conventions** — kebab-case for TS, snake_case for Rust

## Type Alignment Check

| Type | Rust | TS | Aligned? | Notes |
|------|------|-----|----------|-------|
| VaultItem | Has `user_id` | Missing `user_id` | Partial | Intentional client omission? Document it |
| Folder | Has `user_id` | Missing `user_id` | Partial | Same as above |
| ItemType | snake_case serde | string enum values | Yes | Both produce `"login"`, `"secure_note"` etc. |
| User | Full (hash, salt, timestamps) | Minimal (id, email) | Intentional | Client shouldn't have auth_hash/salt |
| RegisterRequest | Identical | Identical | Yes | |
| LoginRequest | Identical | Identical | Yes | |
| AuthResponse | Identical | Identical | Yes | |
| SyncPushRequest | Identical | Identical | Yes | |
| SyncPullRequest | Identical | Identical | Yes | |
| SyncItem | Identical | Identical | Yes | |
| SyncPullResponse | Identical | Identical | Yes | |
| CreateShareRequest | Identical | Identical | Yes | |
| ShareResponse | Identical | Identical | Yes | |
| ShareContent | Identical | Identical | Yes | |
| PasswordGenOptions | Rust struct | TS interface | Yes | Same fields |
| LoginCredential | N/A (client-only) | Defined | N/A | Client-only type, correct |
| SyncQueueEntry | N/A (client-only) | Defined | N/A | Client-only type, correct |
| SyncStatus | N/A (client-only) | Defined | N/A | Client-only type, correct |
| DerivedKeys | N/A (client-only) | Defined | N/A | Client-only type, correct |
| EncryptedPayload | N/A (client-only) | Defined | N/A | Client-only type, correct |

**Verdict:** Good alignment. Rust-side has server-only fields (`user_id`), TS-side has client-only types (`LoginCredential`, `SyncQueueEntry`). This is architecturally correct but needs documentation.

## Dependency Audit

### Rust
| Crate | Version | Concern |
|-------|---------|---------|
| aes-gcm | 0.10 | OK — latest stable |
| argon2 | 0.5 | OK — RustCrypto |
| hkdf | 0.12 | OK — RustCrypto |
| axum | 0.8 | OK — latest |
| sea-orm | 1 | OK — latest |
| jsonwebtoken | 9 | OK |
| thiserror | 2 | OK — latest |
| async-trait | 0.1 | Consider: Rust 1.75+ has native async traits. Can be removed once min Rust version allows |

No unnecessary deps detected. All serve clear purposes.

### TypeScript
| Package | Version | Concern |
|---------|---------|---------|
| argon2-browser | ^1.18.0 | OK for WebCrypto Argon2id |
| ofetch | ^1 | OK — lightweight fetch wrapper |
| idb | ^8 | OK — IndexedDB wrapper |
| zustand | ^5 | OK — lightweight state |
| react | ^19 | Fine — React 19 stable |
| wxt | ^0.19 | OK — WXT framework |
| lucide-react | ^0.468 | OK but unused currently (loaded in ui package, no icons yet) |
| clsx | ^2 | OK but unused currently (no className usage, inline styles) |
| turbo | ^2 | OK |

**Unused deps:** `lucide-react` and `clsx` in `@vaultic/ui` are declared but not imported anywhere. Acceptable for Phase 1 (will be needed soon) but technically YAGNI.

## Optimization Opportunities

- Add `.turbo/` to `.gitignore` and untrack cached files
- Run `cargo fmt` to fix formatting
- Add TS project references for better IDE support
- Consider switching to Tailwind + shadcn for UI components in Phase 4 (as planned)
- Add `repomix-output.xml` to `.gitignore`

## Verdict

**PASS WITH NOTES**

Phase 1 skeleton is well-structured, compiles cleanly, and follows the architecture plan. The "Important" items (`.turbo/` in git, `cargo fmt` failure, `getDeviceId` reliability) should be fixed before Phase 2 begins. Type alignment is solid. No security vulnerabilities in skeleton code. Good foundation for the next phases.

### Action Items (Priority Order)
1. Fix `.turbo/` tracked files + update `.gitignore`
2. Run `cargo fmt` on `vaultic-server/src/main.rs`
3. Add `repomix-output.xml` to `.gitignore`
4. Add comment in TS types explaining intentional `user_id` omission
5. Fix `getDeviceId()` fallback for environments without persistent localStorage
6. Fix password generator modulo bias before Phase 4 ships

## Unresolved Questions
- Is the Docker compose filename change (from `docker-compose.dev.yml` to `docker-compose.yml`) intentional? Should the plan be updated?
- Should `@vaultic/ui` switch to Tailwind now or wait for Phase 4? Current inline styles work but won't support hover/focus states.
