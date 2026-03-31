// Screen 22: Folder Management — view, add, delete folders
import React, { useState } from 'react';
import { tokens, Modal, Button, useTheme } from '@vaultic/ui';
import { IconArrowLeft, IconPlus, IconList, IconFolder, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../stores/vault-store';

interface FolderManagementProps {
  onBack: () => void;
}

export function FolderManagement({ onBack }: FolderManagementProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['vault', 'common']);
  const { folders, items, addFolder, deleteFolder, setSelectedFolder } = useVaultStore();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const allItemCount = items.length;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Check duplicate name
    if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(t('vault:folder.nameExists'));
      return;
    }

    setError('');
    try {
      await addFolder(trimmed);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('vault:folder.createFailed'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFolder(deleteTarget.id);
    setDeleteTarget(null);
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
        <button onClick={onBack} style={backBtn}><IconArrowLeft size={18} stroke={1.5} /></button>
        <span style={titleStyle}>{t('vault:folder.title')}</span>
        <button
          onClick={() => setAdding(!adding)}
          style={addBtnStyle}
          title="Add folder"
        >
          <IconPlus size={20} stroke={1.5} />
        </button>
      </div>

      {/* Folder list */}
      <div style={listStyle}>
        {/* All Items row */}
        <button
          style={rowStyle}
          onClick={() => handleSelectFolder(null)}
        >
          <IconList size={16} stroke={1.5} color={colors.secondary} />
          <span style={rowNameStyle}>{t('vault:folder.allItems')}</span>
          <span style={rowCountStyle}>{allItemCount}</span>
        </button>

        {/* User folders */}
        {folders.map((folder) => (
          <div key={folder.id} style={rowStyle}>
            <button
              style={rowClickArea}
              onClick={() => handleSelectFolder(folder.id)}
            >
              <IconFolder size={16} stroke={1.5} color={colors.secondary} />
              <span style={rowNameStyle}>{folder.name}</span>
              <span style={rowCountStyle}>{folder.itemCount}</span>
            </button>
            <button
              onClick={() => setDeleteTarget({ id: folder.id, name: folder.name })}
              style={deleteBtn}
              title="Delete folder"
            >
              <IconTrash size={16} stroke={1.5} />
            </button>
          </div>
        ))}

        {/* Add folder input */}
        {adding && (
          <div style={addRowStyle}>
            <IconFolder size={16} stroke={1.5} color={colors.secondary} />
            <input
              style={inputStyle}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('vault:folder.newPlaceholder')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
            />
            <button onClick={handleAdd} style={saveBtnStyle}>
              {t('common:save')}
            </button>
          </div>
        )}

        {error && <div style={errorStyle}>{error}</div>}
      </div>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('vault:folder.deleteTitle')}>
        <p style={{ fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family, marginBottom: tokens.spacing.lg }}>
          {t('vault:folder.deleteMessage', { name: deleteTarget?.name })}
        </p>
        <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
          <Button variant="secondary" size="md" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>
            {t('common:cancel')}
          </Button>
          <Button variant="primary" size="md" onClick={handleConfirmDelete} style={{ flex: 1, backgroundColor: colors.error }}>
            {t('common:delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
