---
phase: 1
title: Build & Dependencies Optimization
priority: P0
effort: ~30min
status: pending
---

# Phase 1: Build & Dependencies

## Overview
Quick wins — fix Cargo release profile, deduplicate workspace deps, fix turbo task ordering.

## Related Files
- `Cargo.toml` (workspace root)
- `crates/vaultic-server/Cargo.toml`
- `crates/vaultic-crypto/Cargo.toml`
- `turbo.json`
- `.gitignore`

## Implementation Steps

### 1.1 Add Cargo Release Profile
**File:** `Cargo.toml` (root)

Append after `[workspace.dependencies]`:
```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

**Why:** Currently no release optimization. This reduces binary size ~30-50% and improves runtime perf.

### 1.2 Centralize Duplicate Dependencies
**Problem:** `sha2`, `hex`, `rand` declared in both `vaultic-crypto` AND `vaultic-server`. Server already depends on `vaultic-crypto`.

**Step A:** Add to `Cargo.toml` root `[workspace.dependencies]`:
```toml
sha2 = "0.10"
hex = "0.4"
rand = "0.8"
hmac = "0.12"
base64 = "0.22"
aes-gcm = "0.10"
argon2 = "0.5"
hkdf = "0.12"
zeroize = { version = "1", features = ["derive"] }
```

**Step B:** Update `crates/vaultic-crypto/Cargo.toml` — replace pinned versions with `{ workspace = true }`.

**Step C:** Update `crates/vaultic-server/Cargo.toml`:
- Remove `sha2`, `hex`, `rand` (server should use `vaultic-crypto` exports if possible)
- If server needs `sha2`/`hmac` directly for JWT: keep but use `{ workspace = true }`

**Verification:** `cargo build --workspace` must succeed.

### 1.3 Fix turbo.json Task Dependencies
**File:** `turbo.json`

Current `lint` and `test` have empty `{}` — no dependency on build. Fix:
```json
{
  "lint": {
    "dependsOn": ["^build"]
  },
  "test": {
    "dependsOn": ["build"]
  }
}
```

**Why:** Lint/test may need built artifacts (type declarations, compiled outputs).

### 1.4 Gitignore .wxt/ Build Artifacts
**File:** `.gitignore`

Add under `# Node.js` section:
```
.wxt/
```

**Why:** `.wxt/tsconfig.json`, `.wxt/types/*` are generated build artifacts appearing in git status.

After adding to `.gitignore`, remove tracked files:
```bash
git rm -r --cached packages/extension/.wxt/
```

## Todo
- [ ] 1.1 Add `[profile.release]` to root Cargo.toml
- [ ] 1.2a Add shared deps to workspace
- [ ] 1.2b Update vaultic-crypto to use workspace deps
- [ ] 1.2c Update vaultic-server to use workspace deps
- [ ] 1.3 Fix turbo.json lint/test dependencies
- [ ] 1.4 Gitignore .wxt/ and untrack cached files
- [ ] Verify: `cargo build --workspace` passes
- [ ] Verify: `pnpm build` passes

## Risk
- Workspace dep change could cause version mismatch → pin exact versions
- Low risk overall — config changes only
