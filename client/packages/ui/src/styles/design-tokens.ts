// Source of truth for all Vaultic design values — VIUI corporate design system
// ALL UI components MUST use these tokens. Never hardcode colors/fonts/spacing.

/** Theme-specific color palettes — VIUI corporate design system */
export const lightColors = {
  primary: '#024799',
  primaryHover: '#023A7A',
  accent: '#CC0E0E',
  accentHover: '#A80B0B',
  text: '#0F1E2D',
  secondary: '#4A6278',
  border: '#D0DAE6',
  background: '#F4F7FA',
  surface: '#FFFFFF',
  error: '#B91C1C',
  success: '#0E9F6E',
  warning: '#D47B0A',
  info: '#8ABDEF',
  // Badge semantic backgrounds
  badgeSuccessBg: '#ECFDF5', badgeSuccessText: '#065F46',
  badgeWarningBg: '#FFFBEB', badgeWarningText: '#92400E',
  badgeErrorBg: '#FEF2F2', badgeErrorText: '#991B1B',
  badgeInfoBg: '#EFF6FF', badgeInfoText: '#1E40AF',
  // Semantic surface backgrounds + text (used by form warnings, modals, etc.)
  warningBg: '#FFFBEB', warningText: '#92400E',
  successBg: '#ECFDF5', successText: '#065F46',
  primaryBg: '#EFF6FF',
  onPrimary: '#FFFFFF', // text/icons on primary/accent backgrounds
} as const;

export const darkColors = {
  primary: '#619EE9',
  primaryHover: '#4F8AD6',
  accent: '#ED7B7B',
  accentHover: '#E05A5A',
  text: '#E6EDF3',
  secondary: '#8B949E',
  border: '#21262D',
  background: '#0D1117',
  surface: '#161B22',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#619EE9',
  // Badge semantic backgrounds
  badgeSuccessBg: '#0A2A1F', badgeSuccessText: '#34D399',
  badgeWarningBg: '#2A1F06', badgeWarningText: '#FBBF24',
  badgeErrorBg: '#450A0A', badgeErrorText: '#FECACA',
  badgeInfoBg: '#0A1628', badgeInfoText: '#93C5FD',
  // Semantic surface backgrounds + text (dark mode variants)
  warningBg: '#2A1F06', warningText: '#FBBF24',
  successBg: '#0A2A1F', successText: '#34D399',
  primaryBg: '#0A1628',
  onPrimary: '#FFFFFF', // text/icons on primary/accent backgrounds
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export const tokens = {
  colors: lightColors,
  font: {
    family: "'Nunito Sans', sans-serif",
    size: { xs: 11, sm: 13, base: 14, lg: 16, xl: 18, xxl: 24 },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, full: 9999 },
  extension: { width: 380, height: 520 },
  icon: { size: { sm: 16, md: 20, lg: 24 }, strokeWidth: 1.5 },
} as const;

export type Tokens = typeof tokens;
