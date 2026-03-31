# Agent Rules — Vaultic AI Development

This project is 100% developed by Claude Code Agent. These rules ensure consistent, secure, high-quality code across every session.

---

## 1. Context Loading Protocol

Before ANY implementation work:

1. **Always loaded:** `CLAUDE.md` (auto-loaded by Claude Code)
2. **Before coding:** Read this file (`docs/agent-rules.md`)
3. **Before sensitive modules:** Read `docs/security-policy.md`
4. **For detailed patterns:** Read `docs/code-standards.md`
5. **Before implementing:** Grep codebase for existing patterns — reuse, don't reinvent

### Sensitive Modules (require `security-policy.md` review)

| Module | Path | Why |
|--------|------|-----|
| Auth service | `backend/src/services/auth-service.ts` | Password hashing, token generation |
| Auth middleware | `backend/src/middleware/auth-middleware.ts` | JWT verification |
| Share route | `backend/src/routes/share-route.ts` | Encrypted share handling |
| Sync route | `backend/src/routes/sync-route.ts` | Encrypted vault data |
| Crypto package | `client/packages/crypto/src/**` | All encryption/key derivation |
| Auth store | `client/apps/extension/src/stores/auth-store.ts` | Credential handling |
| Share crypto | `client/apps/extension/src/lib/share-crypto.ts` | Share encryption |
| Fetch with auth | `client/apps/extension/src/lib/fetch-with-auth.ts` | Token management |

---

## 2. Code Patterns — Backend

Architecture: **Route → Service → Model**. No business logic in routes or models.

```typescript
// Route: parse request → call service → send response
router.post('/endpoint', async (req, res, next) => {
  try {
    const result = await someService.doWork(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
});

// Service: business logic, throw AppError on failure
export const someService = {
  async doWork(data: SomeType) {
    if (!valid) throw new AppError('Invalid input', 'VALIDATION_ERROR', 400);
    return await SomeModel.create(data);
  },
};

// Model: schema + validation only, no logic
const schema = new mongoose.Schema({ field: { type: String, required: true } }, { timestamps: true });
```

**Response format:** `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`

**Middleware order:** CORS → JSON parser → request logger → rate limiter → public routes → auth middleware → protected routes → error handler

---

## 3. Code Patterns — Frontend

### Component Structure
- Functional components with hooks
- Inline styles using `React.CSSProperties` + design tokens
- State management: Zustand stores in `src/stores/`

```typescript
import React from 'react';
import { tokens, Button } from '@vaultic/ui';
import { IconArrowLeft } from '@tabler/icons-react';

export function MyComponent({ onAction }: Props) {
  return (
    <div style={{ padding: tokens.spacing.lg, color: tokens.colors.text }}>
      <IconArrowLeft size={20} stroke={1.5} color={tokens.colors.primary} />
      <Button variant="primary" size="md" onClick={onAction}>Action</Button>
    </div>
  );
}
```

### Import Rules
- Cross-package: `import { X } from '@vaultic/crypto'` — NEVER relative paths
- Within package: relative imports OK (`import { X } from './utils'`)
- UI components: always from `@vaultic/ui`
- Icons: ONLY from `@tabler/icons-react` (prefix naming: `IconArrowLeft`, etc.)

### Extension Routing
- Single-page app in `src/entrypoints/popup/app.tsx`
- View state pattern: `useState<View>` with discriminated union types
- Bottom nav: Generator, Vault, Share, Health tabs

---

## 4. Anti-Patterns — DO NOT

| Rule | Rationale |
|------|-----------|
| DO NOT create `*-enhanced.ts`, `*-v2.ts`, `*-new.ts` | Edit existing files directly |
| DO NOT use `any` type | Always type properly for safety |
| DO NOT add `console.log` for debugging | Use proper error handling with AppError |
| DO NOT import across packages with relative paths | Use `@vaultic/*` scoped imports |
| DO NOT hardcode colors, fonts, spacing | Use `tokens.*` from design system |
| DO NOT use emoji icons in UI | Use `lucide-react` with `strokeWidth={1.5}` |
| DO NOT mock database in integration tests | Test real DB for accurate results |
| DO NOT add unnecessary dependencies | Check if existing package covers need (YAGNI) |
| DO NOT create separate `.css` or style files | Use inline styles with tokens |
| DO NOT store sensitive data in localStorage | Use memory-only or encrypted IndexedDB |
| DO NOT commit `.env` or files with real credentials | Use `.env.example` with placeholders |
| DO NOT use `dangerouslySetInnerHTML` | Sanitize all output to prevent XSS |
| DO NOT skip type-checking | Run `tsc --noEmit` after TypeScript changes |
| DO NOT create documentation files unsolicited | Only create when explicitly requested |

---

## 5. Module Ownership

| Package | Responsibility | Key Files |
|---------|---------------|-----------|
| `@vaultic/crypto` | Encryption, key derivation, password generation | `src/index.ts`, `src/kdf.ts` |
| `@vaultic/storage` | IndexedDB abstraction, vault persistence | `src/indexed-db-store.ts` |
| `@vaultic/sync` | Delta sync engine, LWW conflict resolution | `src/sync-engine.ts` |
| `@vaultic/api` | HTTP client, API calls via ofetch | `src/client.ts` |
| `@vaultic/ui` | Shared React components, design tokens | `src/components/`, `src/styles/` |
| `@vaultic/types` | Shared TypeScript types for all packages | `src/index.ts` |
| `@vaultic/extension` | Browser extension popup UI, content scripts | `src/components/`, `src/stores/` |
| `backend/` | Express API server, MongoDB models, services | `src/routes/`, `src/services/` |

**Rule:** Each concern belongs to ONE package. Don't duplicate logic across packages.

---

## 6. Testing Requirements

| Scope | Tool | Coverage | Notes |
|-------|------|----------|-------|
| Backend services | Vitest | 70% minimum | Unit tests for business logic |
| Crypto modules | Vitest | **100% mandatory** | Critical path, test roundtrip encryption |
| API routes | Vitest + supertest | Integration | Test real HTTP with test DB |
| Extension | `tsc --noEmit` | Type-check | No runtime tests yet for popup |
| Extension build | `wxt build` | Build verification | Must compile without errors |

**Rules:**
- NEVER skip failing tests to pass build
- NEVER use fake data, mocks, or cheats to make tests pass
- NEVER ignore test failures — fix root cause
- Run `pnpm --filter @vaultic/extension build` to verify extension compiles

---

## 7. Design System Compliance

All UI MUST use design tokens. Never hardcode visual properties.

| Property | Token | Example |
|----------|-------|---------|
| Colors | `tokens.colors.*` | `tokens.colors.primary` (#2563EB) |
| Font family | `tokens.font.family` | Inter |
| Font size | `tokens.font.size.*` | `tokens.font.size.base` (14px) |
| Font weight | `tokens.font.weight.*` | `tokens.font.weight.semibold` (600) |
| Spacing | `tokens.spacing.*` | `tokens.spacing.lg` (16px) |
| Border radius | `tokens.radius.*` | `tokens.radius.md` (8px) |
| Extension size | `tokens.extension.*` | 380x520px fixed |

### Icons
- Library: `@tabler/icons-react` — ONLY source for icons (import with `Icon` prefix: `IconArrowLeft`)
- Stroke width: `stroke={1.5}` (Tabler convention, consistent across all icons)
- Sizes: 14, 16, 18, 20, 24px depending on context
- Pass `color` prop using `tokens.colors.*`

### Design Reference
- Design file: `system-design.pen` (read via Pencil MCP tools)
- Target: ≥90% match with design for each screen
- Style: Swiss Clean Minimal — stroke-based, single blue accent

---

## 8. Review & Commit Protocol

### After Implementation
1. Run `tsc --noEmit` — fix all type errors
2. Run build command — verify compilation
3. Spawn `code-reviewer` agent for quality check
4. For sensitive modules: run security audit checklist (see `docs/security-policy.md`)

### Commit Rules
- Format: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- No AI references in commit messages
- Keep commits focused on actual changes
- NEVER commit `.env`, credentials, API keys, or secrets

### Pre-commit Checklist
- [ ] TypeScript compiles (`tsc --noEmit`)
- [ ] Extension builds (`pnpm --filter @vaultic/extension build`)
- [ ] No hardcoded secrets or credentials
- [ ] Design tokens used (no hardcoded colors/fonts/spacing)
- [ ] Existing patterns followed (grep before implementing)
