// Horizontal pill/chip selector using design tokens

import React from 'react';
import { tokens } from '../styles/design-tokens';

export interface PillGroupOption<T> {
  value: T;
  label: string;
}

export interface PillGroupProps<T> {
  options: PillGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: React.CSSProperties;
}

export function PillGroup<T>({ options, value, onChange, style }: PillGroupProps<T>) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    ...style,
  };

  return (
    <div style={containerStyle} role="radiogroup">
      {options.map((opt) => {
        const isActive = opt.value === value;
        const pillStyle: React.CSSProperties = {
          padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
          fontSize: tokens.font.size.sm,
          fontWeight: tokens.font.weight.medium,
          fontFamily: tokens.font.family,
          borderRadius: tokens.radius.full,
          border: isActive ? 'none' : `1px solid ${tokens.colors.border}`,
          backgroundColor: isActive ? tokens.colors.primary : 'transparent',
          color: isActive ? '#FFFFFF' : tokens.colors.text,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        };

        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            style={pillStyle}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

PillGroup.displayName = 'PillGroup';
