// Folder selector dropdown — used in vault-item-form to assign items to folders
import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../stores/vault-store';

interface FolderSelectProps {
  value: string | undefined;
  onChange: (folderId: string | undefined) => void;
}

export function FolderSelect({ value, onChange }: FolderSelectProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['vault', 'common']);
  const { folders } = useVaultStore();

  if (folders.length === 0) return null;

  const wrapperStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
    color: colors.secondary, fontFamily: tokens.font.family,
    letterSpacing: 0.5,
  };

  const selectStyle: React.CSSProperties = {
    height: 40,
    borderRadius: tokens.radius.md,
    border: `1.5px solid ${colors.border}`,
    padding: `0 ${tokens.spacing.md}px`,
    fontSize: tokens.font.size.base,
    fontFamily: tokens.font.family,
    color: colors.text,
    backgroundColor: colors.background,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'auto',
  };

  return (
    <div style={wrapperStyle}>
      <label style={labelStyle}>{String(t('common:folder')).toUpperCase()}</label>
      <select
        style={selectStyle}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">{t('common:noFolder')}</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
