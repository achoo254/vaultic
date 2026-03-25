// Screen 07: Add/Edit Credential form
import React, { useState } from 'react';
import { Button, Input, VStack, Textarea, tokens } from '@vaultic/ui';
import { generatePassword } from '@vaultic/crypto';
import { useVaultStore } from '../../stores/vault-store';
import type { LoginCredential } from '@vaultic/types';

interface VaultItemFormProps {
  /** If editing, provide the item ID. */
  editId?: string;
  onBack: () => void;
  onSaved: () => void;
}

export function VaultItemForm({ editId, onBack, onSaved }: VaultItemFormProps) {
  const { items, addItem, updateItem } = useVaultStore();
  const existing = editId ? items.find((i) => i.id === editId) : null;

  const [name, setName] = useState(existing?.credential.name || '');
  const [url, setUrl] = useState(existing?.credential.url || '');
  const [username, setUsername] = useState(existing?.credential.username || '');
  const [password, setPassword] = useState(existing?.credential.password || '');
  const [notes, setNotes] = useState(existing?.credential.notes || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    const pw = generatePassword({
      length: 20, uppercase: true, lowercase: true, digits: true, symbols: true,
    });
    setPassword(pw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    setLoading(true);
    setError('');
    try {
      const credential: LoginCredential = {
        name: name.trim(),
        url: url.trim() || undefined,
        username: username.trim(),
        password,
        notes: notes.trim() || undefined,
      };

      if (editId) {
        await updateItem(editId, credential);
      } else {
        await addItem(credential);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={titleStyle}>{editId ? 'Edit Credential' : 'Add Credential'}</span>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GitHub" required />
        <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com" />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@email.com" />

        <div>
          <div style={passwordRow}>
            <div style={{ flex: 1 }}>
              <Input label="Password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="button" onClick={handleGenerate} style={generateBtn} title="Generate">
              ✨ Generate
            </button>
          </div>
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={3}
        />

        {error && <div style={errorStyle}>{error}</div>}

        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
          {editId ? 'Save Changes' : 'Add Credential'}
        </Button>
      </form>
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  borderBottom: `1px solid ${tokens.colors.border}`,
};
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: tokens.colors.text, padding: 4 };
const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const formStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: tokens.spacing.md,
  padding: tokens.spacing.lg, flex: 1, overflowY: 'auto',
};
const passwordRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: tokens.spacing.sm };
const generateBtn: React.CSSProperties = {
  background: 'none', border: `1px solid ${tokens.colors.primary}`, color: tokens.colors.primary,
  borderRadius: tokens.radius.md, padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
  cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family,
  whiteSpace: 'nowrap', height: 40,
};
const errorStyle: React.CSSProperties = { color: tokens.colors.error, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family };
