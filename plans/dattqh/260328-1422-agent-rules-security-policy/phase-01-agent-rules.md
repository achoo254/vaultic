---
phase: 1
status: completed
priority: high
---

# Phase 1: Create `docs/agent-rules.md`

## Overview

Comprehensive rules document for Claude Code Agent — code patterns, anti-patterns, module ownership, testing, design system, review protocol. ~300 lines.

## Target File

`docs/agent-rules.md`

## Content Structure

### 1. Context Loading Protocol (~30 lines)
- MUST read `CLAUDE.md` at session start
- MUST read `docs/agent-rules.md` before ANY code implementation
- MUST read `docs/security-policy.md` before touching sensitive modules
- MUST read `docs/code-standards.md` for detailed patterns
- Sensitive modules list (copy from CLAUDE.md Agent Protocol)
- MUST grep for existing patterns before implementing new code

### 2. Code Patterns — Backend (~60 lines)
Extract from existing `code-standards.md`, condensed:
- Route → Service → Model layering (with brief example)
- Error handling: `throw new AppError(message, code, status)` → caught by error middleware
- Middleware stack order (from server.ts)
- Response format: `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`
- Validation: Zod schemas or manual check in route handler
- Import pattern: `import { X } from '../services/x-service'`

### 3. Code Patterns — Frontend (~60 lines)
- Component structure: functional components, hooks, inline styles with tokens
- Store pattern: Zustand stores in `src/stores/`
- Import from packages: `import { X } from '@vaultic/crypto'` (never relative cross-package)
- UI components: always from `@vaultic/ui` — Button, Input, Card, Modal, etc.
- Icons: ONLY `lucide-react` with `size={N} strokeWidth={1.5}`
- Styles: inline `React.CSSProperties` using `tokens.*` — NEVER hardcode colors/fonts/spacing
- Extension entry: `src/entrypoints/popup/app.tsx` — single-page routing via view state

### 4. Anti-Patterns — DO NOT List (~40 lines)
Each with brief rationale:
- DO NOT create `*-enhanced.ts`, `*-v2.ts`, `*-new.ts` — edit existing files
- DO NOT use `any` type — always type properly
- DO NOT add `console.log` for debugging — use proper error handling
- DO NOT import across packages with relative paths — use `@vaultic/*`
- DO NOT hardcode colors/fonts/spacing — use design tokens
- DO NOT use emoji icons — use Lucide React icons
- DO NOT mock database in integration tests — test real DB
- DO NOT add unnecessary dependencies — check if existing package covers need
- DO NOT create separate style files for components — use inline styles with tokens
- DO NOT store sensitive data in localStorage — use memory or IndexedDB with encryption
- DO NOT commit `.env` files or any file containing real credentials
- DO NOT use `dangerouslySetInnerHTML` — sanitize all output
- DO NOT skip TypeScript type-checking — run `tsc --noEmit` after changes

### 5. Module Ownership (~30 lines)
Table mapping package → responsibility → key files:
- `@vaultic/crypto` → encryption, key derivation, password generation
- `@vaultic/storage` → IndexedDB abstraction, vault persistence
- `@vaultic/sync` → delta sync engine, conflict resolution
- `@vaultic/api` → HTTP client, API calls
- `@vaultic/ui` → shared React components, design tokens
- `@vaultic/types` → shared TypeScript types
- `@vaultic/extension` → browser extension popup UI, content scripts
- `backend/` → Express API server, MongoDB models

### 6. Testing Requirements (~30 lines)
- Backend services: unit tests with Vitest
- Crypto modules: 100% coverage mandatory
- API routes: integration tests
- Extension components: type-check via `tsc --noEmit`
- Run `pnpm --filter @vaultic/extension build` to verify extension builds
- NEVER skip failing tests to pass build
- NEVER use fake data/mocks/cheats just to pass tests

### 7. Design System Compliance (~30 lines)
- ALL colors: `tokens.colors.primary`, `tokens.colors.text`, etc.
- ALL fonts: `tokens.font.family`, `tokens.font.size.*`, `tokens.font.weight.*`
- ALL spacing: `tokens.spacing.xs` through `tokens.spacing.xxl`
- ALL radii: `tokens.radius.sm`, `tokens.radius.md`, etc.
- Icons: `lucide-react` only, `strokeWidth={1.5}`, sizes 14/16/18/20/24
- Extension: 380x520px fixed viewport
- Design file: `system-design.pen` (read via Pencil MCP tools)

### 8. Review & Commit Protocol (~20 lines)
- After implementation: spawn `code-reviewer` agent
- For sensitive modules: security audit checklist (see security-policy.md)
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- No AI references in commit messages
- Pre-commit: `tsc --noEmit` + build check
- NEVER commit `.env`, credentials, API keys

## Success Criteria

- [x] File created at `docs/agent-rules.md` (196 lines)
- [x] All 8 sections present with concrete examples
- [x] Cross-references to `code-standards.md` and `security-policy.md`
- [x] Under 300 lines
