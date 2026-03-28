// Shared Input component using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    const inputStyle: React.CSSProperties = {
      fontFamily: tokens.font.family,
      fontSize: tokens.font.size.base,
      color: tokens.colors.text,
      backgroundColor: tokens.colors.background,
      border: `1px solid ${error ? tokens.colors.error : tokens.colors.border}`,
      borderRadius: tokens.radius.md,
      padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
      height: 40,
      width: '100%',
      outline: 'none',
      transition: 'border-color 0.15s ease',
      ...style,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        {label && (
          <label
            style={{
              fontSize: tokens.font.size.xs,
              fontWeight: tokens.font.weight.semibold,
              color: tokens.colors.secondary,
              fontFamily: tokens.font.family,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {label}
          </label>
        )}
        <input ref={ref} style={inputStyle} {...props} />
        {error && (
          <span
            style={{
              fontSize: tokens.font.size.xs,
              color: tokens.colors.error,
              fontFamily: tokens.font.family,
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
