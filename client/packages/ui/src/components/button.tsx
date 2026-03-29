// Shared Button component using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';
import type { ThemeColors } from '../styles/design-tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, style, disabled, ...props }, ref) => {
    const { colors } = useTheme();
    const baseStyle: React.CSSProperties = {
      fontFamily: tokens.font.family,
      fontWeight: tokens.font.weight.medium,
      borderRadius: tokens.radius.md,
      border: 'none',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      transition: 'background-color 0.15s ease',
      opacity: disabled || loading ? 0.6 : 1,
      ...getVariantStyle(variant, colors),
      ...getSizeStyle(size),
      ...style,
    };

    return (
      <button ref={ref} style={baseStyle} disabled={disabled || loading} {...props}>
        {loading && <LoadingSpinner />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

function getVariantStyle(variant: string, colors: ThemeColors): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return { backgroundColor: colors.primary, color: '#FFFFFF' };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        color: colors.text,
        border: `1px solid ${colors.border}`,
      };
    case 'ghost':
      return { backgroundColor: 'transparent', color: colors.secondary };
    default:
      return {};
  }
}

/** Animated SVG spinner for button loading state */
function LoadingSpinner() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function getSizeStyle(size: string): React.CSSProperties {
  switch (size) {
    case 'sm':
      return {
        fontSize: tokens.font.size.sm,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
        height: 32,
      };
    case 'md':
      return {
        fontSize: tokens.font.size.base,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
        height: 40,
      };
    case 'lg':
      return {
        fontSize: tokens.font.size.lg,
        padding: `${tokens.spacing.md}px ${tokens.spacing.xl}px`,
        height: 48,
      };
    default:
      return {};
  }
}
