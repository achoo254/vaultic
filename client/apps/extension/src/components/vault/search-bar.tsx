// Search bar with magnifier icon for vault items
import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  const containerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
    border: `1px solid ${colors.border}`, borderRadius: tokens.radius.md,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`, backgroundColor: colors.background,
  };
  const inputStyle: React.CSSProperties = {
    flex: 1, border: 'none', outline: 'none', fontSize: tokens.font.size.base,
    fontFamily: tokens.font.family, color: colors.text, backgroundColor: 'transparent',
  };
  const clearBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
    color: colors.secondary, padding: 2,
  };

  return (
    <div style={containerStyle}>
      <Search size={16} strokeWidth={1.5} color={colors.secondary} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('common:search')}
        style={inputStyle}
      />
      {value && (
        <button onClick={() => onChange('')} style={clearBtn}>
          <X size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
