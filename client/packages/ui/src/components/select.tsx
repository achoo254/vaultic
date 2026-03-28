// Styled native select dropdown using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, style, ...props }, ref) => {
    const { colors } = useTheme();
    const selectStyle: React.CSSProperties = {
      fontFamily: tokens.font.family,
      fontSize: tokens.font.size.base,
      color: colors.text,
      backgroundColor: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: tokens.radius.md,
      padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
      height: 40,
      width: '100%',
      outline: 'none',
      cursor: 'pointer',
      ...style,
    };

    const labelStyle: React.CSSProperties = {
      fontSize: tokens.font.size.sm,
      fontWeight: tokens.font.weight.medium,
      color: colors.text,
      fontFamily: tokens.font.family,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        {label && <label style={labelStyle}>{label}</label>}
        <select ref={ref} style={selectStyle} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

Select.displayName = 'Select';
