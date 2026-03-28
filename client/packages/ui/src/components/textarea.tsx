// Styled textarea with label/error support using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, style, ...props }, ref) => {
    const { colors } = useTheme();
    const textareaStyle: React.CSSProperties = {
      fontFamily: tokens.font.family,
      fontSize: tokens.font.size.base,
      color: colors.text,
      backgroundColor: colors.background,
      border: `1px solid ${error ? colors.error : colors.border}`,
      borderRadius: tokens.radius.md,
      padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
      width: '100%',
      outline: 'none',
      resize: 'vertical',
      minHeight: 80,
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
              color: colors.secondary,
              fontFamily: tokens.font.family,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {label}
          </label>
        )}
        <textarea ref={ref} style={textareaStyle} {...props} />
        {error && (
          <span
            style={{
              fontSize: tokens.font.size.xs,
              color: colors.error,
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

Textarea.displayName = 'Textarea';
