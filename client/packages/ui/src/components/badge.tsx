// Small status/label indicator with color variants

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';
import type { ThemeColors } from '../styles/design-tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

function getVariantStyles(variant: string, colors: ThemeColors): React.CSSProperties {
  switch (variant) {
    case 'success': return { backgroundColor: colors.badgeSuccessBg, color: colors.badgeSuccessText };
    case 'warning': return { backgroundColor: colors.badgeWarningBg, color: colors.badgeWarningText };
    case 'error': return { backgroundColor: colors.badgeErrorBg, color: colors.badgeErrorText };
    default: return { backgroundColor: colors.surface, color: colors.secondary };
  }
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', style, children, ...props }) => {
  const { colors } = useTheme();
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.medium,
    fontFamily: tokens.font.family,
    padding: `2px ${tokens.spacing.sm}px`,
    borderRadius: tokens.radius.full,
    lineHeight: tokens.font.lineHeight.normal,
    ...getVariantStyles(variant, colors),
    ...style,
  };

  return (
    <span style={badgeStyle} {...props}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
