---
phase: 3
status: completed
priority: high
---

# Phase 3: Update `CLAUDE.md` with Agent Protocol

## Overview

Add Agent Protocol section to CLAUDE.md. Trim redundant content to keep under 200 lines. This section is the "quick reference" that's always loaded into agent context.

## Target File

`CLAUDE.md` (root of repo)

## Changes

### ADD: Agent Protocol Section (after `## Project`, before `## Architecture`)

Insert new section `## Agent Protocol` containing:

```markdown
## Agent Protocol

**This project is 100% developed by AI agents. Follow these rules strictly.**

### Mandatory Reading
1. Read this file (CLAUDE.md) at session start
2. Read `docs/agent-rules.md` before ANY code implementation
3. Read `docs/security-policy.md` before touching sensitive modules
4. Read `docs/code-standards.md` for detailed patterns and examples

### Sensitive Modules (require security-policy.md review)
- `backend/src/services/auth-service.ts` — authentication logic
- `backend/src/middleware/auth-middleware.ts` — JWT verification
- `backend/src/routes/share-route.ts` — share endpoint security
- `backend/src/routes/sync-route.ts` — sync data handling
- `client/packages/crypto/src/**` — all encryption/key derivation
- `client/apps/extension/src/stores/auth-store.ts` — credential handling
- `client/apps/extension/src/lib/share-crypto.ts` — share encryption
- `client/apps/extension/src/lib/fetch-with-auth.ts` — token management

### Top 10 Rules
1. MUST read docs/ before implementation — grep for existing patterns first
2. NEVER create new files if existing file serves same purpose — edit existing
3. NEVER hardcode secrets, URLs, credentials — use environment variables
4. ALL UI must use design tokens from `@vaultic/ui` — never hardcode colors/fonts/spacing
5. ALL icons must use `lucide-react` with `strokeWidth={1.5}` — never emoji
6. File size limit: 200 lines — modularize if exceeding
7. Imports across packages: `@vaultic/*` — never relative paths
8. Run `tsc --noEmit` after modifying TypeScript files
9. Conventional commits only — no AI references in messages
10. Security audit required after modifying any sensitive module
```

### TRIM: Remove redundant content to stay under 200 lines

Current CLAUDE.md is 194 lines. Adding ~30 lines of Agent Protocol means we need to trim ~30 lines.

Candidates for trimming:
1. **Implementation Plan section** (lines 175-185) — 11 lines. Plans are in `plans/` dir, not needed in CLAUDE.md. Replace with single line: `See plans/ directory for implementation phases.`
2. **Design Verification Protocol** (lines 163-173) — 11 lines. Move detail to `docs/agent-rules.md` design system section. Keep 1-line reference.
3. **Package Dependency Graph** ASCII art (lines 57-67) — 11 lines. Nice but not essential for agent context. Remove or compress to 1 line.

This frees ~30 lines for the Agent Protocol section.

### UPDATE: Design Style section
Add cross-reference: `See docs/agent-rules.md §7 for full design system compliance rules.`

## Implementation Steps

1. Read current CLAUDE.md
2. Insert `## Agent Protocol` section after `## Project`
3. Trim Implementation Plan section to 1 line
4. Trim Design Verification Protocol to 2 lines with reference
5. Remove Package Dependency Graph ASCII art (info exists in system-architecture.md)
6. Add cross-reference in Design Style section
7. Verify total line count ≤ 200

## Success Criteria

- [x] Agent Protocol section added with all 3 subsections
- [x] 10 sensitive modules listed
- [x] 10 critical rules listed
- [x] Mandatory reading directive present
- [x] Total CLAUDE.md ≤ 200 lines (189 lines)
- [x] No information lost — trimmed content exists in other docs
