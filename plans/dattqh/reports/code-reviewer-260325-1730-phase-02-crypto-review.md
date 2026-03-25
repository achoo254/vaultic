# Code Review: vaultic-crypto

**Date:** 2025-03-25 | **Score: 8/10** | **Verdict: PASS with findings**

## Scope

- Files: 7 source + 4 test files (~280 LOC source)
- Focus: security, correctness, interop, code quality
- All tests pass (19/19), clippy clean

## Overall Assessment

Well-structured crypto crate. Correct algorithm choices (Argon2id, AES-256-GCM, HKDF-SHA256). Zeroize on drop for key types. Domain separation via distinct HKDF info strings. No unsafe code. Good test coverage including interop vectors.

---

## Critical Issues

**None found.**

---

## High Priority

### H1. `auth_key` not zeroized in `derive_auth_hash` (kdf.rs:54-60)

```rust
let mut auth_key = [0u8; KEY_LENGTH];
hk.expand(HKDF_INFO_AUTH, &mut auth_key)?;
let hash = Sha256::digest(auth_key); // auth_key stays on stack
```

The intermediate `auth_key` is 32 bytes of key material that remains on the stack without zeroization. The `Sha256::digest()` consumes by value but the compiler may optimize and leave the original intact.

**Fix:** Use `zeroize::Zeroize` on `auth_key` after hashing:
```rust
let hash = Sha256::digest(&auth_key);
auth_key.zeroize();
```

### H2. Email as raw Argon2id salt — short salt risk (kdf.rs:23-33)

Argon2 recommends salt >= 16 bytes. Short emails like `a@b.co` (6 bytes) produce a weak salt. Bitwarden pre-hashes email to normalize length; this impl passes raw email bytes.

**Impact:** Reduced brute-force resistance for short emails. Not critical for MVP but should be addressed before production.

**Fix:** Hash email to fixed-length salt:
```rust
let salt = Sha256::digest(email); // always 32 bytes
argon2.hash_password_into(password, &salt, &mut key)?;
```

**Note on interop:** If you change salt derivation, the TS (WebCrypto) side MUST match exactly. Document and update test vectors.

### H3. HKDF called without explicit salt (kdf.rs:40, 52)

```rust
Hkdf::<Sha256>::new(None, master_key.as_bytes());
```

`None` salt uses a zero-filled byte array internally. While HKDF is still secure with no salt (the IKM is high-entropy from Argon2id), best practice is to provide an explicit application-specific salt for defense-in-depth.

**Fix (optional for MVP):**
```rust
const HKDF_SALT: &[u8] = b"vaultic-hkdf-v1";
Hkdf::<Sha256>::new(Some(HKDF_SALT), master_key.as_bytes());
```

---

## Medium Priority

### M1. `use rand::RngCore` at bottom of password_gen.rs (line 106)

Import placed after function body instead of at top with other imports. Won't cause issues but non-idiomatic.

### M2. No `Debug`/`Clone` impls on key types (types.rs)

`MasterKey` and `EncryptionKey` have no `Debug` impl. This is intentional (prevent accidental logging) — good. But also no `Clone`, which means keys can't be duplicated — also good for security. Worth a doc comment explaining this is deliberate.

### M3. `generate_share_key` returns raw array, not a newtype (password_gen.rs:100-104)

Returns `[u8; 32]` with no zeroize guarantee. Should return a newtype with `ZeroizeOnDrop` like the other keys for consistency. The caller has no automatic cleanup.

**Fix:**
```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct ShareKey(pub(crate) [u8; 32]);

pub fn generate_share_key() -> ShareKey {
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    ShareKey(key)
}
```

### M4. `thread_rng()` called per-operation (cipher.rs:22, password_gen.rs:76)

`thread_rng()` is CSPRNG (backed by OS entropy) so this is correct and safe. However, for batch operations (encrypting many vault items), passing an `&mut impl CryptoRng` would be more efficient. Low priority — current usage pattern is single-item encryption.

### M5. Interop test writes file to crate root (interop_tests.rs:59-61)

`export_test_vectors_json` writes `test-vectors.json` to `CARGO_MANIFEST_DIR` during test execution. This is a test side-effect that modifies the source tree. Should write to a temp dir or `OUT_DIR`, or be behind a feature flag / `#[ignore]`.

---

## Minor Issues

### L1. `expect()` in password generator (password_gen.rs:96)

```rust
String::from_utf8(password).expect("password chars are all ASCII")
```

The invariant is correct (all source chars are ASCII), but `expect` = panic in library code. Consider `unwrap_or_else` or document as infallible via comment. Very low risk.

### L2. No `#[must_use]` on public functions

Functions like `encrypt`, `decrypt`, `derive_master_key` return `Result` — Rust already warns on unused `Result`, but `#[must_use]` on the types themselves (`MasterKey`, etc.) would prevent ignoring construction results.

### L3. No constant-time comparison for auth hashes

`AuthHash` stores hex string. If server compares auth hashes, it should use constant-time comparison. The `subtle` crate is in Cargo.toml but unused in this crate. The comparison likely happens server-side, but providing a `ct_eq` method on `AuthHash` would be safer.

---

## Interop Assessment (Rust <-> WebCrypto)

| Aspect | Status | Notes |
|--------|--------|-------|
| Argon2id params | Match pending | TS not implemented yet (Phase 4). Params must match: m=64MB, t=3, p=4, 32-byte output |
| Salt handling | Risk | If email used as raw salt in TS, must be identical encoding (UTF-8 bytes). See H2 |
| HKDF info strings | Match pending | TS must use identical `"vaultic-enc"` / `"vaultic-auth"` info bytes |
| AES-256-GCM format | Match pending | Both must use `nonce(12) \|\| ciphertext \|\| tag(16)` layout |
| Auth hash | Match pending | TS must do HKDF -> SHA256 -> hex, same pipeline |
| Test vectors | Exist | `test-vectors.json` generated from Rust, TS tests should consume these |

**Key risk:** TS WebCrypto impl doesn't exist yet. When implemented, interop tests are essential. The test vector approach is correct.

---

## Positive Observations

1. **Correct algorithm choices** — Argon2id (not bcrypt/scrypt), AES-256-GCM (not CBC), HKDF (not raw hash)
2. **Zeroize on Drop** for key newtypes — prevents key material lingering in memory
3. **Domain separation** via distinct HKDF info strings — enc key and auth key are cryptographically independent
4. **Good test coverage** — determinism, roundtrip, tamper detection, wrong-key rejection, empty/large payloads
5. **Interop test vectors** — JSON export for cross-platform verification
6. **No unsafe code** — entire crate is safe Rust
7. **Clean clippy** — zero warnings
8. **`subtle` crate included** — ready for constant-time operations when needed

---

## Recommended Actions (Priority Order)

1. **Zeroize `auth_key`** in `derive_auth_hash` — 5-min fix, real security impact (H1)
2. **Wrap `generate_share_key` return** in newtype with `ZeroizeOnDrop` (M3)
3. **Normalize email salt** to fixed length before Argon2id — coordinate with future TS impl (H2)
4. **Move import** `use rand::RngCore` to top of password_gen.rs (M1)
5. **Add `#[ignore]` to `export_test_vectors_json`** or move to build script (M5)
6. **Consider HKDF explicit salt** for defense-in-depth (H3, optional for MVP)
7. **Add `ct_eq` on `AuthHash`** using `subtle` crate (L3, before server auth impl)

---

## Metrics

| Metric | Value |
|--------|-------|
| Source LOC | ~280 |
| Test LOC | ~200 |
| Tests | 19 pass, 0 fail |
| Clippy | 0 warnings |
| Unsafe | None |
| Dependencies | 11 (all well-known crypto crates) |

---

## Unresolved Questions

1. Will the server compare `AuthHash` with constant-time eq, or naive `==`? If naive, timing side-channel on login.
2. Should email normalization (lowercase, trim) happen before salt derivation? Current impl is case-sensitive — `Alice@test.com` and `alice@test.com` produce different keys.
3. Is there a key rotation / re-encryption strategy planned? Current API has no versioning on the encrypted blob format.
