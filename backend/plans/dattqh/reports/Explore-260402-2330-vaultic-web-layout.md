# Vaultic Web App Layout Exploration Report

## Summary
Found and documented the complete layout structure for the Vaultic web app running on port **5180**. The app uses a **480px max-width** centered mobile-first responsive layout with React Router v7 and Zustand for state management.

---

## 1. Main App Layout Component

**File:** `/d/CONG VIEC/vaultic/client/apps/web/src/app.tsx`

**Key Layout Properties:**
```typescript
// Root container — responsive centered layout
<div
  style={{
    maxWidth: 480,           // Mobile-first: 480px max width
    margin: '0 auto',        // Center horizontally
    minHeight: '100vh',      // Full viewport height
    background: colors.background,
    color: colors.text,
    padding: '0 16px',       // 16px horizontal padding on all sides
  }}
>
```

**Layout Characteristics:**
- **Max width:** 480px (mobile-focused design)
- **Horizontal padding:** 16px (tokens.spacing.lg)
- **Height:** Full viewport (minHeight: 100vh)
- **Centering:** Flexbox margin auto
- **Background/Text:** Theme-aware from useTheme() hook

---

## 2. Vault Page Component

**File:** `/d/CONG VIEC/vaultic/client/apps/web/src/pages/vault-page.tsx`

**Features:**
- Header with user email, password generator icon, settings icon, lock icon
- Search bar for filtering vault items
- Vault items rendered as Card components in a flex column layout
- FAB (Floating Action Button) at bottom-right: `position: fixed, bottom: 24px, right: 24px`
- Modal for adding/editing items
- Password generator modal

**Key Layout Classes/Styles:**
```typescript
// Header layout
headerStyle: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${tokens.spacing.lg}px 0`,  // 16px vertical
  gap: tokens.spacing.sm,               // 8px
}

// Vault items container
display: 'flex',
flexDirection: 'column',
gap: tokens.spacing.sm  // 8px between items

// FAB positioning
position: 'fixed',
bottom: 24,
right: 24,
width: 48,
height: 48,
borderRadius: tokens.radius.full  // 9999px = full circle
```

**No bottom navigation bar** — Navigation is via header buttons and router links.

---

## 3. Router Configuration

**File:** `/d/CONG VIEC/vaultic/client/apps/web/src/router.tsx`

**Routes:**
```typescript
/               → /vault (redirect)
/onboarding     → OnboardingPage
/login          → LoginPage
/register       → RegisterPage
/vault          → VaultPage (protected with AuthGuard)
/settings       → SettingsPage (protected with AuthGuard)
/share          → SharePage (protected with AuthGuard)
```

**Navigation Pattern:** React Router v7 with `useNavigate()` hook. All internal navigation uses `navigate()` function calls (no bottom tab bar).

---

## 4. CSS & Styling System

### Global CSS File
**File:** `/d/CONG VIEC/vaultic/client/apps/web/src/global.css`

**Key Styles:**
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: 'Nunito Sans', 'Inter', sans-serif;
  line-height: 1.5;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}

/* Scrollbar: 6px width, #D0DAE6 thumb */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #D0DAE6; }
::-webkit-scrollbar-track { background: transparent; }

/* Selection: dark blue background */
::selection { background: #024799; color: #FFFFFF; }

/* Focus outline for accessibility */
:focus-visible { outline: 2px solid #024799; outline-offset: 2px; }
```

### Design Tokens & Theme System
**File:** `/d/CONG VIEC/vaultic/client/packages/ui/src/styles/design-tokens.ts`

**Layout/Spacing Tokens:**
```typescript
tokens = {
  spacing: {
    xs: 4,      // 4px
    sm: 8,      // 8px
    md: 12,     // 12px
    lg: 16,     // 16px
    xl: 20,     // 20px
    xxl: 24,    // 24px
    xxxl: 32,   // 32px
  },
  radius: {
    sm: 4,      // 4px
    md: 8,      // 8px
    lg: 12,     // 12px
    full: 9999, // Circular
  },
  font: {
    family: "'Nunito Sans', sans-serif",
    size: { xs: 11, sm: 13, base: 14, lg: 16, xl: 18, xxl: 24 },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  extension: { width: 380, height: 520 },
  icon: { size: { sm: 16, md: 20, lg: 24 }, strokeWidth: 1.5 },
}
```

**Color Tokens:**
- **Light Mode:** Primary #024799, Text #0F1E2D, Background #F4F7FA, Surface #FFFFFF, Border #D0DAE6
- **Dark Mode:** Primary #619EE9, Text #E6EDF3, Background #0D1117, Surface #161B22, Border #21262D

---

## 5. Build & Port Configuration

**File:** `/d/CONG VIEC/vaultic/client/apps/web/vite.config.ts`

**Server Configuration:**
```typescript
server: {
  port: 5180,  // ← Web app port
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

**Build Output:** Vite-based with React Fast Refresh, source maps disabled, code splitting for crypto/vendor bundles.

---

## 6. Width Constraints Summary

| Component | Width | Notes |
|-----------|-------|-------|
| **App Root** | 480px max | Mobile-first, centered, with 16px h-padding |
| **Header** | flex, space-between | Full width within app container |
| **Search Bar** | Full width | Input component |
| **Vault Items** | Full width | Cards stacked vertically |
| **FAB** | 48px × 48px | Fixed position, bottom-right |
| **Modal** | ~Full width | Inside 480px container (see Modal component) |
| **Scrollbar** | 6px | WebKit only |

---

## 7. Page Layout Patterns

All pages follow the same pattern:
1. **Header:** flex, space-between, with back/icon buttons and title
2. **Content:** Full-width, uses tokens.spacing for vertical gaps
3. **Forms:** flex column, gap tokens.spacing.md
4. **Cards:** Outlined or filled variants, using design tokens

**No bottom navigation/menu bar exists** — this is a single-stack router app.

---

## File Paths Reference

| File | Purpose |
|------|---------|
| `/d/CONG VIEC/vaultic/client/apps/web/src/app.tsx` | Main layout wrapper (480px max-width) |
| `/d/CONG VIEC/vaultic/client/apps/web/src/router.tsx` | Route definitions |
| `/d/CONG VIEC/vaultic/client/apps/web/src/pages/vault-page.tsx` | Vault list, search, FAB |
| `/d/CONG VIEC/vaultic/client/apps/web/src/pages/settings-page.tsx` | Settings with back button |
| `/d/CONG VIEC/vaultic/client/apps/web/src/pages/share-page.tsx` | Share feature with back button |
| `/d/CONG VIEC/vaultic/client/apps/web/src/global.css` | Global reset + scrollbar + selection |
| `/d/CONG VIEC/vaultic/client/apps/web/vite.config.ts` | Port 5180, /api proxy |
| `/d/CONG VIEC/vaultic/client/packages/ui/src/styles/design-tokens.ts` | Spacing, radius, font, color tokens |
| `/d/CONG VIEC/vaultic/client/packages/ui/src/styles/theme-provider.tsx` | Light/dark theme context |
| `/d/CONG VIEC/vaultic/client/packages/ui/src/components/card.tsx` | Card component (outlined/filled) |

---

## Key Findings

✓ **Port:** 5180  
✓ **Layout:** Mobile-first, 480px max-width, centered  
✓ **Navigation:** React Router v7 (no bottom nav bar)  
✓ **Theming:** Context-based light/dark with localStorage persistence  
✓ **Spacing:** Consistent token-based system (4px–32px)  
✓ **No Tailwind:** Raw inline styles + design tokens, no utility classes  
✓ **FAB Pattern:** Fixed position floating action button on vault page  
✓ **State:** Zustand stores (auth, vault)  
✓ **UI Components:** Custom React components from @vaultic/ui package  

---

**Report Generated:** 2026-04-02
