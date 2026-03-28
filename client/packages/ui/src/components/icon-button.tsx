// Small icon-only button for actions (copy, delete, edit, toggle visibility)

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outlined';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', variant = 'ghost', style, disabled, ...props }, ref) => {
    const { colors } = useTheme();
    const dimension = size === 'sm' ? 28 : 36;

    const buttonStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dimension,
      height: dimension,
      padding: 0,
      border: variant === 'outlined' ? `1px solid ${colors.border}` : 'none',
      borderRadius: tokens.radius.sm,
      backgroundColor: 'transparent',
      color: colors.secondary,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background-color 0.15s ease, color 0.15s ease',
      ...style,
    };

    return <button ref={ref} style={buttonStyle} disabled={disabled} {...props} />;
  },
);

IconButton.displayName = 'IconButton';
