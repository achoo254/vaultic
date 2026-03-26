---
type: brainstorm
date: 2026-03-26
slug: codebase-optimization
---

# Brainstorm: Vaultic Codebase Optimization

## Problem Statement

Codebase has accumulated technical debt across build config, dependencies, code quality, testing, and docs. Need systematic optimization before next feature development.

## Current State Analysis

### Build & Dependencies
- **Cargo.toml**: No `[profile.release]` — missing LTO, strip, opt-level optimizations
- **Duplicate deps**: `sha2 0.10`, `hex 0.4`, `rand 0.8` in both `vaultic-crypto` AND `vaultic-server` (server already depends on vaultic-crypto)
- **turbo.json**: `lint` and `test` tasks have no `dependsOn` — can run before `build` completes
- **Workspace deps**: Only 6 deps centralized — `sha2`, `hex`, `rand`, `hmac` should be added

### Code Quality
- **2 TODOs** in `settings-page.tsx:39,49` — sync purge & vault push unimplemented
- **Large files**: `background.ts` (218L), `register-form.tsx` (215L), `sync_service.rs` (204L)
- `vault-store.ts` actually only 21 lines (scout report was wrong about 255L)
- **Type safety**: Excellent — strict TS, only 2 `any` usages, no unsafe Rust

### Testing
- **TypeScript**: ZERO tests, ZERO test config (no vitest/jest setup anywhere)
- **Rust**: 4 integration tests in `vaultic-crypto` only; server/types/migration = 0 tests

### Documentation
- Docs say Phase 3 pending, but git shows Phase 7-8 commits already shipped
- Roadmap, changelog, codebase-summary all stale

---

## Evaluated Approaches

### Approach A: Sequential (Build → Quality → Tests → Docs)
**Pros**: Fix foundation first, tests verify correct code, docs reflect final state
**Cons**: Slower to show results

### Approach B: Parallel Workstreams
**Pros**: Faster completion, independent tasks don't block each other
**Cons**: Risk of merge conflicts, coordination overhead

### Approach C: Incremental (Quick wins → Deep fixes) ✅ RECOMMENDED
**Pros**: Immediate value from quick config fixes, builds momentum, testing setup enables future work
**Cons**: None significant — quick wins are low-risk

---

## Recommended Solution: Incremental Optimization

### Phase 1: Build & Deps (Quick wins, ~30min)
1. Add `[profile.release]` to root `Cargo.toml`:
   - `opt-level = 3, lto = true, codegen-units = 1, strip = true`
2. Move `sha2`, `hex`, `rand`, `hmac` to `[workspace.dependencies]`
3. Update `vaultic-server/Cargo.toml` to use `workspace = true` for shared deps
4. Fix `turbo.json`: add `dependsOn: ["^build"]` to lint & test

### Phase 2: Code Quality (~1-2h)
1. Refactor `background.ts` (218L) — extract message handlers
2. Refactor `register-form.tsx` (215L) — extract form logic / validation
3. Refactor `sync_service.rs` (204L) — split push/pull/purge into separate fns or submodules
4. Implement the 2 TODOs in `settings-page.tsx` (sync purge + vault push)
5. Gitignore `.wxt/` build artifacts

### Phase 3: Testing Setup (~2-3h)
1. Setup vitest in workspace root + per-package config
2. Priority test targets:
   - `@vaultic/crypto` — encrypt/decrypt, key derivation, interop with Rust
   - `@vaultic/sync` — delta sync, conflict resolution (LWW)
   - `@vaultic/storage` — vault CRUD, sync queue
   - `@vaultic/api` — API client mocking
3. Rust: add integration tests for `vaultic-server` handlers (auth flow, sync push/pull)

### Phase 4: Docs Sync (~1h)
1. Update `project-roadmap.md` — reflect actual Phase 1-8 completion status
2. Update `codebase-summary.md` — reflect current file structure
3. Update `project-changelog.md` — add missing entries from git history
4. Update `system-architecture.md` if any architectural changes occurred

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Refactoring breaks existing behavior | Medium | High | Write tests for target files BEFORE refactoring |
| Workspace dep version conflict | Low | Medium | Pin exact versions in workspace |
| TODOs require API changes | Medium | Medium | Check server endpoints exist first |

## Success Metrics
- [ ] `cargo build --release` uses LTO + strip
- [ ] Zero duplicate deps between crates
- [ ] All files <200 lines
- [ ] Vitest configured + ≥1 test per TS package
- [ ] Docs accurately reflect implementation status
- [ ] `pnpm build && pnpm lint` respects dependency order

## Unresolved Questions
1. Do sync purge/vault push endpoints already exist in the server? (TODOs may need server work)
2. Should Rust server tests use a real PostgreSQL or mock? (recommend: testcontainers for integration)
3. Is `.wxt/` needed in git for CI/CD or can be fully gitignored?
