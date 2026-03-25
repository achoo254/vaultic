// Screen 06: Credential Detail — view username, password, notes, folder
import React, { useState } from 'react';
import { tokens, VStack, HStack, Modal, Button } from '@vaultic/ui';
import { PasswordField } from '../common/password-field';
import { CopyButton } from '../common/copy-button';
import { useVaultStore } from '../../stores/vault-store';

interface VaultItemDetailProps {
  itemId: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function VaultItemDetail({ itemId, onBack, onEdit, onDelete }: VaultItemDetailProps) {
  const item = useVaultStore((s) => s.items.find((i) => i.id === itemId));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!item) return <div style={centerStyle}>Item not found</div>;

  const { credential } = item;
  const initial = credential.name.charAt(0).toUpperCase();
  const hue = credential.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={onBack} style={iconBtn}>←</button>
        <span style={headerTitle}>{credential.name}</span>
        <div style={headerActions}>
          <button onClick={onEdit} style={iconBtn} title="Edit">✏️</button>
          <button onClick={() => setShowDeleteConfirm(true)} style={iconBtn} title="Delete">🗑️</button>
        </div>
      </div>

      {/* Item badge */}
      <div style={badgeSection}>
        <div style={{ ...avatarLg, backgroundColor: `hsl(${hue}, 60%, 90%)`, color: `hsl(${hue}, 60%, 40%)` }}>
          {initial}
        </div>
        <div>
          <div style={nameStyle}>{credential.name}</div>
          {credential.url && <div style={urlStyle}>{credential.url}</div>}
        </div>
      </div>

      {/* Fields */}
      <div style={fieldsStyle}>
        {credential.username && (
          <div style={fieldRow}>
            <div style={fieldLabel}>Username</div>
            <div style={fieldValueRow}>
              <span style={fieldValue}>{credential.username}</span>
              <CopyButton text={credential.username} />
            </div>
          </div>
        )}

        {credential.password && (
          <PasswordField value={credential.password} />
        )}

        {credential.notes && (
          <div style={fieldRow}>
            <div style={fieldLabel}>Notes</div>
            <div style={notesStyle}>{credential.notes}</div>
          </div>
        )}

        <div style={metaStyle}>Last modified: {new Date(item.updated_at).toLocaleDateString()}</div>
      </div>

      {/* Delete confirmation */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Credential?">
        <VStack gap="md" align="center">
          <div style={{ fontSize: 32 }}>🗑️</div>
          <div style={modalText}>This will permanently delete "{credential.name}". This action cannot be undone.</div>
          <HStack gap="md" style={{ width: '100%' }}>
            <Button variant="secondary" size="md" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" size="md" onClick={onDelete} style={{ flex: 1, backgroundColor: tokens.colors.error }}>Delete</Button>
          </HStack>
        </VStack>
      </Modal>
    </div>
  );
}


const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  borderBottom: `1px solid ${tokens.colors.border}`,
};
const headerTitle: React.CSSProperties = {
  flex: 1, fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
  color: tokens.colors.text, fontFamily: tokens.font.family,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const headerActions: React.CSSProperties = { display: 'flex', gap: 4 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, color: tokens.colors.secondary };
const badgeSection: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
  padding: `${tokens.spacing.lg}px ${tokens.spacing.xxl}px`,
};
const avatarLg: React.CSSProperties = {
  width: 48, height: 48, borderRadius: tokens.radius.lg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold, fontFamily: tokens.font.family,
};
const nameStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const urlStyle: React.CSSProperties = { fontSize: tokens.font.size.sm, color: tokens.colors.secondary, fontFamily: tokens.font.family };
const fieldsStyle: React.CSSProperties = { padding: `0 ${tokens.spacing.xxl}px`, flex: 1, display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg };
const fieldRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const fieldLabel: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family };
const fieldValueRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const fieldValue: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family };
const notesStyle: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family, whiteSpace: 'pre-wrap' };
const metaStyle: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family, marginTop: 'auto', paddingBottom: tokens.spacing.lg };
const centerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: tokens.colors.secondary };

const modalText: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.secondary, fontFamily: tokens.font.family, textAlign: 'center' };
