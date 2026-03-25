// Search bar with magnifier icon for vault items
import React from 'react';
import { tokens } from '@vaultic/ui';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div style={containerStyle}>
      <span style={iconStyle}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search vault..."
        style={inputStyle}
      />
      {value && (
        <button onClick={() => onChange('')} style={clearBtn}>✕</button>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md,
  padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`, backgroundColor: tokens.colors.background,
};
const iconStyle: React.CSSProperties = { fontSize: 14, color: tokens.colors.secondary };
const inputStyle: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none', fontSize: tokens.font.size.base,
  fontFamily: tokens.font.family, color: tokens.colors.text, backgroundColor: 'transparent',
};
const clearBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
  color: tokens.colors.secondary, padding: 2,
};
