// Layout primitives: Stack, HStack, VStack — replace repeated flex patterns

import React from 'react';
import { tokens } from '../styles/design-tokens';

type SpacingKey = keyof typeof tokens.spacing;

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: SpacingKey;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  flex?: number | string;
  wrap?: boolean;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'column', gap, align, justify, flex, wrap, style, ...props }, ref) => {
    const stackStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: direction,
      ...(gap && { gap: tokens.spacing[gap] }),
      ...(align && { alignItems: align }),
      ...(justify && { justifyContent: justify }),
      ...(flex !== undefined && { flex }),
      ...(wrap && { flexWrap: 'wrap' }),
      ...style,
    };

    return <div ref={ref} style={stackStyle} {...props} />;
  },
);

Stack.displayName = 'Stack';

// Thin wrappers with sensible defaults
export type HStackProps = Omit<StackProps, 'direction'>;
export type VStackProps = Omit<StackProps, 'direction'>;

export const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  (props, ref) => <Stack ref={ref} direction="row" align="center" {...props} />,
);

HStack.displayName = 'HStack';

export const VStack = React.forwardRef<HTMLDivElement, VStackProps>(
  (props, ref) => <Stack ref={ref} direction="column" {...props} />,
);

VStack.displayName = 'VStack';
