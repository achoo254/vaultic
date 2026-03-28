# Phase 4: Polish & Testing

## Overview
- **Priority:** P2
- **Status:** Complete
- **Effort:** 1h
- **Description:** UX polish, edge case handling, and verification

## Context
- Depends on Phases 1-3

## Implementation Steps

### Step 1: UX Warnings
- SetupPasswordForm: Bold warning "There is no password recovery. If you forget your master password, your vault data will be permanently lost."
- URL Share: "This link has no expiry or view limit. Anyone with this link can decrypt the data."
- URL Share size: Real-time character count "~1.2KB / 2KB"

### Step 2: Edge Cases
- Handle corrupted VaultConfig in chrome.storage.local → reset to 'no_vault'
- Handle invalid URL fragment in share page → show "Invalid link" error
- Handle offline user trying server share → show "Create account to use server share"
- Lock screen: handle both offline and online users (same screen, same logic)

### Step 3: Build Verification
- `pnpm build` all packages
- `pnpm lint` all packages
- Manual test matrix:

| Scenario | Expected |
|----------|----------|
| Fresh install | SetupPasswordForm shown |
| Set password | Vault unlocked, empty |
| Add items | Items saved to IndexedDB |
| Close/reopen | LockScreen shown |
| Enter password | Vault unlocked with items |
| Wrong password | Error message |
| Share credential (offline) | URL generated, <2KB |
| Open share URL | Decrypts correctly |
| Share long notes | Warning shown if >2KB |
| Upgrade to account | Mode→online, vault preserved |
| Existing online user login | Works as before |
| Server share (online) | Works as before |
| Old share links | Still work |

### Step 4: Update docs
- Update `docs/system-architecture.md` — add offline mode section
- Update `docs/project-changelog.md` — log feature
- Update `CLAUDE.md` if architecture section needs update

## Todo List
- [x] Add UX warnings to setup and share screens
- [x] Handle edge cases (corrupted config, invalid URL, etc.)
- [x] Full build verification (`pnpm build && pnpm lint`)
- [x] Manual test all scenarios
- [x] Update documentation
- [x] Fixed getEncryptionKey extractable flag (code review fix)

## Success Criteria
- All test scenarios pass
- No compile errors
- Clean lint
- Docs updated
