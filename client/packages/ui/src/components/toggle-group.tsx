// Segmented control with active/inactive states using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';

export interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface ToggleGroupProps<T extends string> {
  options: ToggleGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: React.CSSProperties;
}

export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  style,
}: ToggleGroupProps<T>) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: 2,
    gap: 2,
    ...style,
  };

  return (
    <div style={containerStyle} role="radiogroup">
      {options.map((opt) => {
        const isActive = opt.value === value;
        const buttonStyle: React.CSSProperties = {
          flex: 1,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          fontSize: tokens.font.size.sm,
          fontWeight: isActive ? tokens.font.weight.medium : tokens.font.weight.regular,
          fontFamily: tokens.font.family,
          color: isActive ? tokens.colors.text : tokens.colors.secondary,
          backgroundColor: isActive ? tokens.colors.background : 'transparent',
          border: 'none',
          borderRadius: tokens.radius.sm,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
        };

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            style={buttonStyle}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

ToggleGroup.displayName = 'ToggleGroup';
