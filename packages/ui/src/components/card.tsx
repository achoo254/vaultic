// Card container with outlined/filled variants using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';

type SpacingKey = keyof typeof tokens.spacing;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'outlined' | 'filled';
  padding?: SpacingKey;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'outlined', padding = 'md', style, ...props }, ref) => {
    const cardStyle: React.CSSProperties = {
      borderRadius: tokens.radius.md,
      padding: tokens.spacing[padding],
      ...(variant === 'outlined'
        ? {
            backgroundColor: tokens.colors.background,
            border: `1px solid ${tokens.colors.border}`,
          }
        : {
            backgroundColor: tokens.colors.surface,
            border: 'none',
          }),
      ...style,
    };

    return <div ref={ref} style={cardStyle} {...props} />;
  },
);

Card.displayName = 'Card';
