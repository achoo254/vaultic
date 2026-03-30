// Source of truth for all Vaultic design values — extracted from system-design.pen
// ALL UI components MUST use these tokens. Never hardcode colors/fonts/spacing.

/** Theme-specific color palettes — Zinc scale for neutral tones */
export const lightColors = {
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
  // Badge semantic backgrounds
  badgeSuccessBg: '#DCFCE7', badgeSuccessText: '#166534',
  badgeWarningBg: '#FEF9C3', badgeWarningText: '#854D0E',
  badgeErrorBg: '#FEE2E2', badgeErrorText: '#991B1B',
  // Semantic surface backgrounds + text (used by form warnings, modals, etc.)
  warningBg: '#FEF3C7', warningText: '#92400E',
  successBg: '#F0FDF4', successText: '#16A34A',
  primaryBg: '#EFF6FF',
} as const;

export const darkColors = {
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  text: '#FAFAFA',
  secondary: '#A1A1AA',
  border: '#27272A',
  background: '#09090B',
  surface: '#18181B',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  // Badge semantic backgrounds
  badgeSuccessBg: '#052E16', badgeSuccessText: '#4ADE80',
  badgeWarningBg: '#422006', badgeWarningText: '#FBBF24',
  badgeErrorBg: '#450A0A', badgeErrorText: '#F87171',
  // Semantic surface backgrounds + text (dark mode variants)
  warningBg: '#422006', warningText: '#FBBF24',
  successBg: '#052E16', successText: '#4ADE80',
  primaryBg: '#1E3A5F',
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export const tokens = {
  colors: lightColors,
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
