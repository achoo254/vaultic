---
phase: 5
status: completed
priority: medium
effort: 1h
---

# Phase 5: Refactor Extension Components

## Overview
Replace inline style patterns in extension components with new shared UI components. Incremental — highest-duplication files first.

## Priority Refactor Targets

### High (most duplication)
| File | Replace with |
|------|-------------|
| `share-page.tsx` | ToggleGroup, Card, Checkbox, VStack |
| `share-options.tsx` | PillGroup, SectionHeader |
| `settings-page.tsx` | Card, VStack, SectionHeader, Checkbox, Select |
| `vault-item-detail.tsx` | Modal, Card, VStack, Badge, IconButton |
| `password-generator-view.tsx` | Card, Checkbox, PillGroup, VStack |

### Medium
| File | Replace with |
|------|-------------|
| `vault-item-form.tsx` | VStack, Textarea, Card |
| `security-health.tsx` | Card, Badge, VStack, SectionHeader |
| `export-vault.tsx` | Card, VStack |
| `import-passwords.tsx` | Card, VStack |

### Low (minimal benefit)
| File | Replace with |
|------|-------------|
| `login-form.tsx` | VStack (already clean) |
| `lock-screen.tsx` | VStack |

## Approach
- Replace one component at a time, verify build after each
- Remove orphaned style constants after replacement
- Do NOT change component behavior or layout — visual output must remain identical

## Todo
- [x] Refactor share-page.tsx + share-options.tsx
- [x] Refactor settings-page.tsx
- [x] Refactor vault-item-detail.tsx
- [x] Refactor password-generator-view.tsx
- [x] Refactor remaining medium-priority files
- [x] Remove unused inline style constants
- [x] Final build + visual check
