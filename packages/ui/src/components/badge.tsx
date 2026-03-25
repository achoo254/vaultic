// Small status/label indicator with color variants

import React from 'react';
import { tokens } from '../styles/design-tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: { backgroundColor: tokens.colors.surface, color: tokens.colors.secondary },
  success: { backgroundColor: '#DCFCE7', color: '#166534' },
  warning: { backgroundColor: '#FEF9C3', color: '#854D0E' },
  error: { backgroundColor: '#FEE2E2', color: '#991B1B' },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', style, children, ...props }) => {
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.medium,
    fontFamily: tokens.font.family,
    padding: `2px ${tokens.spacing.sm}px`,
    borderRadius: tokens.radius.full,
    lineHeight: tokens.font.lineHeight.normal,
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span style={badgeStyle} {...props}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
