// Screen 22: Folder Management — view, add, delete folders
import React, { useState } from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { ArrowLeft, Plus, List, Folder, MoreVertical } from 'lucide-react';
import { useVaultStore } from '../../stores/vault-store';

interface FolderManagementProps {
  onBack: () => void;
}

export function FolderManagement({ onBack }: FolderManagementProps) {
  const { colors } = useTheme();
  const { folders, items, addFolder, deleteFolder, setSelectedFolder } = useVaultStore();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const allItemCount = items.length;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Check duplicate name
    if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Folder name already exists');
      return;
    }

    setError('');
    try {
      await addFolder(trimmed);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Items will be moved to All Items.`)) return;
    await deleteFolder(id);
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolder(folderId);
    onBack();
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', height: '100%',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `0 ${tokens.spacing.lg}px`,
    height: 52,
    borderBottom: `1px solid ${colors.border}`,
  };

  const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: colors.text, padding: 4, display: 'flex', alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
    color: colors.text, fontFamily: tokens.font.family,
  };

  const addBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: colors.primary, padding: 4, display: 'flex', alignItems: 'center',
  };

  const listStyle: React.CSSProperties = {
    flex: 1, overflowY: 'auto',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    cursor: 'pointer', background: 'none', border: 'none',
    width: '100%', textAlign: 'left',
    fontFamily: tokens.font.family,
  };

  const rowClickArea: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: tokens.font.family, textAlign: 'left', padding: 0,
  };

  const rowNameStyle: React.CSSProperties = {
    flex: 1, fontSize: tokens.font.size.base,
    fontWeight: tokens.font.weight.regular,
    color: colors.text,
  };

  const rowCountStyle: React.CSSProperties = {
    fontSize: tokens.font.size.sm,
    color: colors.secondary,
  };

  const deleteBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: colors.secondary, fontSize: 16, padding: '4px 8px',
  };

  const addRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, border: `1.5px solid ${colors.primary}`,
    borderRadius: tokens.radius.md, padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    fontSize: tokens.font.size.base, fontFamily: tokens.font.family,
    outline: 'none', color: colors.text,
  };

  const saveBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: colors.primary, fontWeight: tokens.font.weight.semibold,
    fontSize: tokens.font.size.base, fontFamily: tokens.font.family,
  };

  const errorStyle: React.CSSProperties = {
    padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
    color: colors.error, fontSize: tokens.font.size.sm,
    fontFamily: tokens.font.family,
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={18} strokeWidth={1.5} /></button>
        <span style={titleStyle}>Folders</span>
        <button
          onClick={() => setAdding(!adding)}
          style={addBtnStyle}
          title="Add folder"
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Folder list */}
      <div style={listStyle}>
        {/* All Items row */}
        <button
          style={rowStyle}
          onClick={() => handleSelectFolder(null)}
        >
          <List size={16} strokeWidth={1.5} color={colors.secondary} />
          <span style={rowNameStyle}>All Items</span>
          <span style={rowCountStyle}>{allItemCount}</span>
        </button>

        {/* User folders */}
        {folders.map((folder) => (
          <div key={folder.id} style={rowStyle}>
            <button
              style={rowClickArea}
              onClick={() => handleSelectFolder(folder.id)}
            >
              <Folder size={16} strokeWidth={1.5} color={colors.secondary} />
              <span style={rowNameStyle}>{folder.name}</span>
              <span style={rowCountStyle}>{folder.itemCount}</span>
            </button>
            <button
              onClick={() => handleDelete(folder.id, folder.name)}
              style={deleteBtn}
              title="Delete folder"
            >
              <MoreVertical size={16} strokeWidth={1.5} />
            </button>
          </div>
        ))}

        {/* Add folder input */}
        {adding && (
          <div style={addRowStyle}>
            <Folder size={16} strokeWidth={1.5} color={colors.secondary} />
            <input
              style={inputStyle}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New Folder"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
            />
            <button onClick={handleAdd} style={saveBtnStyle}>
              Save
            </button>
          </div>
        )}

        {error && <div style={errorStyle}>{error}</div>}
      </div>
    </div>
  );
}
