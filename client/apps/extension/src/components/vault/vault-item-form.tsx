// Screen 07: Add/Edit Credential form
import React, { useState, useEffect } from 'react';
import { Button, Input, VStack, HStack, Modal, Card, Textarea, tokens, useTheme } from '@vaultic/ui';
import { IconArrowLeft, IconSparkles, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { generatePassword } from '@vaultic/crypto';
import { useVaultStore } from '../../stores/vault-store';
import { FolderSelect } from './folder-select';
import type { LoginCredential } from '@vaultic/types';

interface VaultItemFormProps {
  /** If editing, provide the item ID. */
  editId?: string;
  onBack: () => void;
  onSaved: () => void;
}

export function VaultItemForm({ editId, onBack, onSaved }: VaultItemFormProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['vault', 'common']);
  const { items, addItem, updateItem } = useVaultStore();
  const existing = editId ? items.find((i) => i.id === editId) : null;

  const [name, setName] = useState(existing?.credential.name || '');
  const [url, setUrl] = useState(existing?.credential.url || '');
  const [username, setUsername] = useState(existing?.credential.username || '');
  const [password, setPassword] = useState(existing?.credential.password || '');
  const [notes, setNotes] = useState(existing?.credential.notes || '');
  const [folderId, setFolderId] = useState<string | undefined>(existing?.folder_id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genLength, setGenLength] = useState(20);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genPreview, setGenPreview] = useState('');

  const regeneratePreview = () => {
    setGenPreview(generatePassword({ length: genLength, uppercase: genUpper, lowercase: genLower, digits: genDigits, symbols: genSymbols }));
  };

  // Auto-regenerate when options change while modal is open
  useEffect(() => {
    if (showGenModal) regeneratePreview();
  }, [genLength, genUpper, genLower, genDigits, genSymbols]);

  const openGenModal = () => {
    regeneratePreview();
    setShowGenModal(true);
  };

  const applyGenerated = () => {
    setPassword(genPreview);
    setShowGenModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('vault:form.nameRequired')); return; }

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
        await updateItem(editId, credential, folderId);
      } else {
        await addItem(credential, folderId);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('vault:form.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    borderBottom: `1px solid ${colors.border}`,
  };
  const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex', alignItems: 'center' };
  const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family };
  const formStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: tokens.spacing.md,
    padding: tokens.spacing.lg, flex: 1, overflowY: 'auto',
  };
  const passwordRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: tokens.spacing.sm };
  const generateBtn: React.CSSProperties = {
    background: 'none', border: `1px solid ${colors.primary}`, color: colors.primary,
    borderRadius: tokens.radius.md, padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family,
    whiteSpace: 'nowrap', height: 40, display: 'flex', alignItems: 'center', gap: 4,
  };
  const errorStyle: React.CSSProperties = { color: colors.error, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}><IconArrowLeft size={18} stroke={1.5} /></button>
        <span style={titleStyle}>{editId ? t('vault:form.editTitle') : t('vault:form.addTitle')}</span>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <FolderSelect value={folderId} onChange={setFolderId} />
        <Input label={t('common:name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('vault:form.namePlaceholder')} required />
        <Input label={t('common:url')} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('vault:form.urlPlaceholder')} />
        <Input label={t('common:username')} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('vault:form.usernamePlaceholder')} />

        <div>
          <div style={passwordRow}>
            <div style={{ flex: 1 }}>
              <Input label={t('common:password')} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('vault:form.passwordPlaceholder')} />
            </div>
            <button type="button" onClick={openGenModal} style={generateBtn} title={t('vault:form.generate')}>
              <IconSparkles size={14} stroke={1.5} /> {t('vault:form.generate')}
            </button>
          </div>
        </div>

        <Textarea
          label={t('common:notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('vault:form.notesPlaceholder')}
          rows={3}
        />

        {error && <div style={errorStyle}>{error}</div>}

        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
          {editId ? t('vault:form.saveChanges') : t('vault:form.addCredential')}
        </Button>
      </form>

      {/* Password Generator Modal */}
      <Modal open={showGenModal} onClose={() => setShowGenModal(false)} title={t('vault:generator.generatePassword')}>
        <VStack gap="md">
          <Card variant="outlined" padding="sm" style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, backgroundColor: colors.surface }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: tokens.font.size.sm, color: colors.text, wordBreak: 'break-all' }}>{genPreview}</span>
            <button type="button" onClick={regeneratePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <IconRefresh size={14} stroke={1.5} color={colors.secondary} />
            </button>
          </Card>

          <HStack gap="md">
            <span style={{ fontSize: tokens.font.size.base, color: colors.text, fontFamily: tokens.font.family }}>{t('vault:generator.length', { length: genLength })}</span>
            <input type="range" min={8} max={64} value={genLength} onChange={(e) => { setGenLength(+e.target.value); }} style={{ flex: 1 }} />
          </HStack>

          <GenToggle label={t('vault:generator.uppercase')} checked={genUpper} onChange={setGenUpper} />
          <GenToggle label={t('vault:generator.lowercase')} checked={genLower} onChange={setGenLower} />
          <GenToggle label={t('vault:generator.numbers')} checked={genDigits} onChange={setGenDigits} />
          <GenToggle label={t('vault:generator.symbols')} checked={genSymbols} onChange={setGenSymbols} />

          <HStack gap="sm" style={{ marginTop: tokens.spacing.sm }}>
            <Button variant="secondary" size="md" onClick={regeneratePreview} style={{ flex: 1 }}>{t('vault:generator.regenerate')}</Button>
            <Button variant="primary" size="md" onClick={applyGenerated} style={{ flex: 1 }}>{t('vault:generator.usePassword')}</Button>
          </HStack>
        </VStack>
      </Modal>
    </div>
  );
}

function GenToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: tokens.font.size.base, color: colors.text, fontFamily: tokens.font.family }}>{label}</span>
      <button type="button" onClick={() => onChange(!checked)} style={{
        width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        padding: 2, display: 'flex', alignItems: 'center',
        backgroundColor: checked ? colors.primary : colors.border,
        transition: 'background-color 0.2s',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', backgroundColor: colors.onPrimary,
          transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }} />
      </button>
    </div>
  );
}
