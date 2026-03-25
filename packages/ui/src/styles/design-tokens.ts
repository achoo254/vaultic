// Source of truth for all Vaultic design values — extracted from system-design.pen
// ALL UI components MUST use these tokens. Never hardcode colors/fonts/spacing.

export const tokens = {
  colors: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    text: '#18181B',
    secondary: '#71717A',
    border: '#E4E4E7',
    background: '#FFFFFF',
    surface: '#F4F4F5',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  font: {
    family: "'Inter', sans-serif",
    size: { xs: 11, sm: 13, base: 14, lg: 16, xl: 18, xxl: 24 },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, full: 9999 },
  extension: { width: 380, height: 520 },
  icon: { size: { sm: 16, md: 20, lg: 24 }, strokeWidth: 1.5 },
} as const;

export type Tokens = typeof tokens;
