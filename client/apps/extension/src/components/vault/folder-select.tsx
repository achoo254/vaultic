// Folder selector dropdown — used in vault-item-form to assign items to folders
import React from 'react';
import { tokens } from '@vaultic/ui';
import { useVaultStore } from '../../stores/vault-store';

interface FolderSelectProps {
  value: string | undefined;
  onChange: (folderId: string | undefined) => void;
}

export function FolderSelect({ value, onChange }: FolderSelectProps) {
  const { folders } = useVaultStore();

  if (folders.length === 0) return null;

  return (
    <div style={wrapperStyle}>
      <label style={labelStyle}>FOLDER</label>
      <select
        style={selectStyle}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">No folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
  color: tokens.colors.secondary, fontFamily: tokens.font.family,
  letterSpacing: 0.5,
};

const selectStyle: React.CSSProperties = {
  height: 40,
  borderRadius: tokens.radius.md,
  border: `1.5px solid ${tokens.colors.border}`,
  padding: `0 ${tokens.spacing.md}px`,
  fontSize: tokens.font.size.base,
  fontFamily: tokens.font.family,
  color: tokens.colors.text,
  backgroundColor: '#fff',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'auto',
};
