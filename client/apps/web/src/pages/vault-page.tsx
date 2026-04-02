// Vault page — main vault list with search, folders, CRUD, and password generator
import React, { useEffect, useState } from 'react';
import { Button, Input, Card, tokens, useTheme, Modal } from '@vaultic/ui';
import { IconPlus, IconCopy, IconTrash, IconEdit, IconKey } from '@tabler/icons-react';
import { useAuthStore } from '../stores/auth-store';
import { useVaultStore, useFilteredItems, type DecryptedVaultItem } from '../stores/vault-store';
import { generatePassword } from '@vaultic/crypto';
import { copyAndAutoClear } from '../lib/web-clipboard';

export function VaultPage() {
  const { colors } = useTheme();
  const { vaultState, email, mode } = useAuthStore();
  const { loading, searchQuery, setSearchQuery, loadVault, addItem, updateItem, deleteItem } = useVaultStore();
  const filteredItems = useFilteredItems();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<DecryptedVaultItem | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);

  // Load vault items on mount (AuthGuard ensures we're unlocked)
  useEffect(() => {
    loadVault();
  }, []);

  return (
    <div>
      {/* Page header — nav moved to AppLayout sidebar/bottom-nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: tokens.spacing.lg, gap: tokens.spacing.sm,
      }}>
        <div style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold, color: colors.text, fontFamily: tokens.font.family }}>
          Vault
        </div>
        <button onClick={() => setShowGenModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Password Generator">
          <IconKey size={20} stroke={1.5} color={colors.secondary} />
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: tokens.spacing.lg }}>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vault..."
        />
      </div>

      {/* Vault items */}
      {loading ? (
        <p style={{ color: colors.secondary, textAlign: 'center', fontFamily: tokens.font.family }}>Loading vault...</p>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: tokens.spacing.xxxl, color: colors.secondary, fontFamily: tokens.font.family }}>
          <p>No items yet</p>
          <Button variant="primary" size="md" onClick={() => setShowAddModal(true)} style={{ marginTop: tokens.spacing.lg }}>
            <IconPlus size={16} stroke={1.5} /> Add First Item
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
          {filteredItems.map((item) => (
            <VaultItemCard key={item.id} item={item} colors={colors} onEdit={() => setEditItem(item)} onDelete={() => deleteItem(item.id)} />
          ))}
        </div>
      )}

      {/* FAB */}
      {filteredItems.length > 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed', bottom: 80, right: 24,
            width: 48, height: 48, borderRadius: tokens.radius.full,
            background: colors.primary, color: colors.onPrimary,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <IconPlus size={24} stroke={1.5} />
        </button>
      )}

      {/* Add/Edit Modal */}
      <VaultItemFormModal
        open={showAddModal || !!editItem}
        item={editItem}
        onClose={() => { setShowAddModal(false); setEditItem(null); }}
        onSave={async (cred) => {
          if (editItem) await updateItem(editItem.id, cred);
          else await addItem(cred);
          setShowAddModal(false);
          setEditItem(null);
        }}
        colors={colors}
      />

      {/* Password Generator */}
      <PasswordGeneratorModal open={showGenModal} onClose={() => setShowGenModal(false)} colors={colors} />
    </div>
  );
}

// --- Sub-components ---

function VaultItemCard({ item, colors, onEdit, onDelete }: {
  item: DecryptedVaultItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyPassword = async () => {
    if (item.credential.password) {
      await copyAndAutoClear(item.credential.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card style={{ padding: tokens.spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.credential.name || 'Untitled'}
          </div>
          <div style={{ fontSize: tokens.font.size.sm, color: colors.secondary, fontFamily: tokens.font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.credential.username || item.credential.url || ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: tokens.spacing.xs, flexShrink: 0 }}>
          <button onClick={copyPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Copy password">
            <IconCopy size={16} stroke={1.5} color={copied ? colors.success : colors.secondary} />
          </button>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Edit">
            <IconEdit size={16} stroke={1.5} color={colors.secondary} />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Delete">
            <IconTrash size={16} stroke={1.5} color={colors.error} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function VaultItemFormModal({ open, item, onClose, onSave, colors }: {
  open: boolean;
  item: DecryptedVaultItem | null;
  onClose: () => void;
  onSave: (cred: import('@vaultic/types').LoginCredential) => Promise<void>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.credential.name || '');
      setUrl(item.credential.url || '');
      setUsername(item.credential.username || '');
      setPassword(item.credential.password || '');
      setNotes(item.credential.notes || '');
    } else {
      setName(''); setUrl(''); setUsername(''); setPassword(''); setNotes('');
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, url, username, password, notes });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit Item' : 'Add Item'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GitHub" required />
        <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com" />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your@email.com" />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        <div style={{ display: 'flex', gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} style={{ flex: 1 }}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordGeneratorModal({ open, onClose, colors }: {
  open: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [length, setLength] = useState(20);
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setGenerated(generatePassword({ length, uppercase: true, lowercase: true, digits: true, symbols: true }));
    setCopied(false);
  };

  useEffect(() => { if (open) generate(); }, [open, length]);

  const copy = async () => {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Password Generator">
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        <div style={{
          padding: tokens.spacing.md, background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: tokens.radius.md, fontFamily: 'monospace', fontSize: tokens.font.size.base,
          color: colors.text, wordBreak: 'break-all',
        }}>
          {generated}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
          <span style={{ fontSize: tokens.font.size.sm, color: colors.secondary, fontFamily: tokens.font.family }}>Length: {length}</span>
          <input type="range" min={8} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
          <Button variant="secondary" size="md" onClick={generate} style={{ flex: 1 }}>Regenerate</Button>
          <Button variant="primary" size="md" onClick={copy} style={{ flex: 1 }}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
