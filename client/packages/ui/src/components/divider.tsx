// Horizontal/vertical separator line using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical';
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ direction = 'horizontal', style, ...props }, ref) => {
    const { colors } = useTheme();
    const dividerStyle: React.CSSProperties = {
      backgroundColor: colors.border,
      ...(direction === 'horizontal'
        ? { height: 1, width: '100%' }
        : { width: 1, alignSelf: 'stretch' }),
      flexShrink: 0,
      ...style,
    };

    return <div ref={ref} style={dividerStyle} {...props} />;
  },
);

Divider.displayName = 'Divider';
