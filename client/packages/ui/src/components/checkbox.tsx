// Styled checkbox with label using design tokens

import React, { useId } from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, disabled, style }) => {
  const id = useId();
  const { colors } = useTheme();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const inputStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    margin: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    accentColor: colors.primary,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.font.size.base,
    fontFamily: tokens.font.family,
    color: colors.text,
    userSelect: 'none',
  };

  return (
    <label htmlFor={id} style={containerStyle}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={inputStyle}
      />
      <span style={labelStyle}>{label}</span>
    </label>
  );
};

Checkbox.displayName = 'Checkbox';
