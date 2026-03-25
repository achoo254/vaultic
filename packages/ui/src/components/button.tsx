// Shared Button component using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, style, disabled, ...props }, ref) => {
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
      ...getVariantStyle(variant),
      ...getSizeStyle(size),
      ...style,
    };

    return (
      <button ref={ref} style={baseStyle} disabled={disabled || loading} {...props}>
        {loading && <span style={{ width: 16, height: 16 }}>...</span>}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

function getVariantStyle(variant: string): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return { backgroundColor: tokens.colors.primary, color: '#FFFFFF' };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        color: tokens.colors.text,
        border: `1px solid ${tokens.colors.border}`,
      };
    case 'ghost':
      return { backgroundColor: 'transparent', color: tokens.colors.secondary };
    default:
      return {};
  }
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
