---
status: completed
priority: high
estimated_effort: small
---

# Plan: Agent Rules & Security Policy for AI-Only Development

**Brainstorm:** `plans/dattqh/reports/brainstorm-260328-1422-agent-rules-security-policy.md`

## Goal

Create 3-layer documentation architecture so Claude Code Agent consistently follows codebase patterns and security requirements every session.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Create `docs/agent-rules.md` | completed | [phase-01](phase-01-agent-rules.md) |
| 2 | Create `docs/security-policy.md` | completed | [phase-02](phase-02-security-policy.md) |
| 3 | Update `CLAUDE.md` with Agent Protocol | completed | [phase-03](phase-03-claude-md-update.md) |

## Architecture

```
CLAUDE.md (always loaded, ~200 lines)
├── Project overview (existing)
├── NEW: Agent Protocol (top 10 rules)
├── NEW: Sensitive modules list
├── Tech stack & build commands (existing)
└── "MUST READ docs/ before coding"
         │
         ▼
docs/agent-rules.md (read before implement)
├── Context loading protocol
├── Code patterns with examples
├── Anti-patterns (DO NOT list)
├── Module ownership map
├── Testing requirements
├── Design system compliance
└── Review protocol
         │
         ▼
docs/security-policy.md (read for sensitive modules)
├── Cryptography rules
├── Secrets management
├── Authentication & authorization
├── Data protection
└── Security audit checklist
```

## Dependencies

- None — documentation-only changes, no code modifications
- Existing docs (`code-standards.md`, `system-architecture.md`) remain unchanged, cross-referenced
