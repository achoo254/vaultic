// Horizontal folder filter bar — sits under search bar in vault list
import React from 'react';
import { tokens } from '@vaultic/ui';
import { useVaultStore } from '../../stores/vault-store';

interface FolderBarProps {
  onManageFolders: () => void;
}

export function FolderBar({ onManageFolders }: FolderBarProps) {
  const { folders, items, selectedFolder, setSelectedFolder } = useVaultStore();

  if (folders.length === 0) return null;

  const allCount = items.length;

  return (
    <div style={containerStyle}>
      <div style={scrollStyle}>
        {/* All Items chip */}
        <button
          style={chipStyle(!selectedFolder)}
          onClick={() => setSelectedFolder(null)}
        >
          All ({allCount})
        </button>

        {/* Folder chips */}
        {folders.map((f) => (
          <button
            key={f.id}
            style={chipStyle(selectedFolder === f.id)}
            onClick={() => setSelectedFolder(f.id)}
          >
            {f.name} ({f.itemCount})
          </button>
        ))}

        {/* Manage folders button */}
        <button style={manageStyle} onClick={onManageFolders} title="Manage folders">
          ⚙
        </button>
      </div>
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: `4px 12px`,
    borderRadius: tokens.radius.full,
    border: `1px solid ${active ? tokens.colors.primary : tokens.colors.border}`,
    backgroundColor: active ? tokens.colors.primaryHover + '20' : 'transparent',
    color: active ? tokens.colors.primary : tokens.colors.secondary,
    fontSize: tokens.font.size.xs,
    fontWeight: active ? tokens.font.weight.semibold : tokens.font.weight.regular,
    fontFamily: tokens.font.family,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

const containerStyle: React.CSSProperties = {
  padding: `0 ${tokens.spacing.lg}px ${tokens.spacing.sm}px`,
};

const scrollStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
  alignItems: 'center',
  scrollbarWidth: 'none', // Firefox
};

const manageStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  color: tokens.colors.secondary,
  padding: '4px 6px',
  flexShrink: 0,
};
