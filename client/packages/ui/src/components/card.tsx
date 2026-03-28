// Card container with outlined/filled variants using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

type SpacingKey = keyof typeof tokens.spacing;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'outlined' | 'filled';
  padding?: SpacingKey;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'outlined', padding = 'md', style, ...props }, ref) => {
    const { colors } = useTheme();
    const cardStyle: React.CSSProperties = {
      borderRadius: tokens.radius.md,
      padding: tokens.spacing[padding],
      ...(variant === 'outlined'
        ? {
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
          }
        : {
            backgroundColor: colors.surface,
            border: 'none',
          }),
      ...style,
    };

    return <div ref={ref} style={cardStyle} {...props} />;
  },
);

Card.displayName = 'Card';
