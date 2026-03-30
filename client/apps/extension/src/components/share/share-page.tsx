// Screen 13/14: Share Page — unified hybrid share (data in URL, metadata on server)
import React, { useState } from 'react';
import { Button, VStack, Checkbox, Textarea, ToggleGroup, tokens, useTheme } from '@vaultic/ui';
import { IconArrowLeft, IconWorld } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { estimateFragmentSize, MAX_FRAGMENT_LENGTH } from '@vaultic/crypto';
import { ShareOptions } from './share-options';
import { ShareLinkResult } from './share-link-result';
import { encryptShareToUrl } from '../../lib/share-crypto';
import { useVaultStore } from '../../stores/vault-store';
import { useAuthStore } from '../../stores/auth-store';
import type { DecryptedVaultItem } from '../../stores/vault-store';
import { fetchWithAuth } from '../../lib/fetch-with-auth';

const SHARE_BASE_URL = import.meta.env.VITE_SHARE_URL || 'http://localhost:8080/s';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface SharePageProps {
  onBack?: () => void;
}

export function SharePage({ onBack }: SharePageProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['share', 'common']);
  const [mode, setMode] = useState<'vault' | 'quick'>('vault');
  const [ttlHours, setTtlHours] = useState<number | null>(24);
  const [maxViews, setMaxViews] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; ttl: number | null; views: number | null; warning?: string } | null>(null);

  // From Vault state
  const [selectedItem, setSelectedItem] = useState<DecryptedVaultItem | null>(null);
  const [shareUsername, setShareUsername] = useState(true);
  const [sharePassword, setSharePassword] = useState(true);

  // Quick Share state
  const [quickText, setQuickText] = useState('');

  const items = useVaultStore((s) => s.items);
  const authMode = useAuthStore((s) => s.mode);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // Mode options defined inside component to access t()
  const MODE_OPTIONS = [
    { value: 'vault' as const, label: t('share:mode.fromVault') },
    { value: 'quick' as const, label: t('share:mode.quickShare') },
  ];

  // Build plaintext from current selection
  const getPlaintext = (): string | null => {
    if (mode === 'vault') {
      if (!selectedItem) return null;
      const shared: Record<string, string> = {};
      if (shareUsername) shared.username = selectedItem.credential.username || '';
      if (sharePassword) shared.password = selectedItem.credential.password || '';
      shared.name = selectedItem.credential.name;
      return JSON.stringify(shared);
    }
    return quickText.trim() || null;
  };

  const plaintext = getPlaintext();
  const plaintextBytes = plaintext ? new TextEncoder().encode(plaintext).length : 0;
  const estimatedSize = plaintextBytes > 0 ? estimateFragmentSize(plaintextBytes) : 0;
  const overLimit = estimatedSize > MAX_FRAGMENT_LENGTH;

  const handleGenerate = async () => {
    setError('');
    if (!plaintext) {
      setError(mode === 'vault' ? t('share:error.selectCredential') : t('share:error.enterText'));
      return;
    }
    if (overLimit) {
      setError(t('share:error.tooLarge'));
      return;
    }

    setLoading(true);
    try {
      const { fragment, shareId } = await encryptShareToUrl(plaintext);
      let metadataFailed = false;

      // Post metadata to server (works for both online and offline-queued)
      try {
        if (authMode === 'online' && isLoggedIn) {
          await fetchWithAuth('/api/v1/shares/metadata', {
            method: 'POST',
            body: JSON.stringify({
              share_id: shareId,
              max_views: maxViews,
              ttl_hours: ttlHours,
            }),
          });
        } else {
          // Anonymous / offline: post without auth
          await fetch(`${API_BASE_URL}/api/v1/shares/metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              share_id: shareId,
              max_views: maxViews,
              ttl_hours: ttlHours,
            }),
          });
        }
      } catch {
        // Server unreachable — link works for decryption but no access controls
        metadataFailed = true;
      }

      const shareUrl = `${SHARE_BASE_URL}/${shareId}#${fragment}`;
      setResult({
        url: shareUrl, ttl: ttlHours, views: maxViews,
        warning: metadataFailed ? t('share:error.metadataWarning') : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('share:error.shareFailed'));
    } finally {
      setLoading(false);
    }
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, height: 52,
    padding: `0 ${tokens.spacing.lg}px`, borderBottom: `1px solid ${colors.border}`,
  };
  const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex', alignItems: 'center' };
  const headerTitle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family };
  const sourceCard: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
    border: `1px solid ${colors.border}`, borderRadius: 10, height: 56,
  };
  const sourceAvatar: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primary,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  const sourceName: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.text, fontWeight: tokens.font.weight.medium };
  const sourceUser: React.CSSProperties = { fontSize: tokens.font.size.sm, color: colors.secondary };
  const changeBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: colors.primary, cursor: 'pointer',
    fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, marginLeft: 'auto', flexShrink: 0,
  };
  const itemBtn: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    border: `1px solid ${colors.border}`, borderRadius: tokens.radius.sm,
    backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: tokens.font.family,
  };
  const itemName: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.text, fontWeight: tokens.font.weight.medium };
  const itemUser: React.CSSProperties = { fontSize: tokens.font.size.sm, color: colors.secondary };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: tokens.font.weight.semibold, color: colors.secondary,
    letterSpacing: 1, textTransform: 'uppercase', fontFamily: tokens.font.family,
  };
  const errorStyle: React.CSSProperties = { color: colors.error, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family };
  const emptyStyle: React.CSSProperties = { color: colors.secondary, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, textAlign: 'center', padding: tokens.spacing.lg };

  if (result) {
    return (
      <ShareLinkResult
        shareUrl={result.url}
        ttlHours={result.ttl}
        maxViews={result.views}
        warning={result.warning}
        onDone={() => setResult(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header — design screen 13: arrow-left + "Secure Share" */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}><IconArrowLeft size={20} stroke={1.5} /></button>
        <span style={headerTitle}>{t('share:title')}</span>
      </div>

      <VStack gap="lg" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <ToggleGroup options={MODE_OPTIONS} value={mode} onChange={(v) => setMode(v)} />

        {mode === 'vault' ? (
          <VStack gap="sm">
            {!selectedItem ? (
              <VStack gap="xs" style={{ maxHeight: 150, overflowY: 'auto' }}>
                {items.length === 0 && <div style={emptyStyle}>{t('share:vault.noItems')}</div>}
                {items.slice(0, 10).map((item) => (
                  <button key={item.id} onClick={() => setSelectedItem(item)} style={itemBtn}>
                    <span style={itemName}>{item.credential.name}</span>
                    <span style={itemUser}>{item.credential.username}</span>
                  </button>
                ))}
              </VStack>
            ) : (
              <VStack gap="sm">
                {/* Source card with avatar — design screen 13 */}
                <div style={sourceCard}>
                  <div style={sourceAvatar}>
                    <IconWorld size={18} stroke={1.5} color="#fff" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={sourceName}>{selectedItem.credential.name}</span>
                    <span style={sourceUser}>{selectedItem.credential.username}</span>
                  </div>
                  <button onClick={() => setSelectedItem(null)} style={changeBtn}>{t('share:vault.change')}</button>
                </div>
                {/* Checkboxes with SHARE label */}
                <div style={sectionLabel}>{t('share:vault.shareLabel')}</div>
                <Checkbox checked={shareUsername} onChange={setShareUsername} label={t('share:vault.username')} />
                <Checkbox checked={sharePassword} onChange={setSharePassword} label={t('share:vault.password')} />
              </VStack>
            )}
          </VStack>
        ) : (
          <VStack gap="sm">
            <div style={{ fontSize: 13, color: colors.secondary, fontFamily: tokens.font.family, lineHeight: 1.4 }}>
              {t('share:quick.description')}
            </div>
            <div style={sectionLabel}>{t('share:quick.contentLabel')}</div>
            <Textarea
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder={t('share:quick.placeholder')}
              rows={5}
            />
          </VStack>
        )}

        <ShareOptions ttlHours={ttlHours} maxViews={maxViews} onTtlChange={setTtlHours} onMaxViewsChange={setMaxViews} />

        {/* Size indicator */}
        {plaintextBytes > 0 && (
          <div style={{ fontSize: tokens.font.size.xs, color: overLimit ? colors.error : colors.secondary, fontFamily: tokens.font.family }}>
            ~{(estimatedSize / 1000).toFixed(1)} KB / {(MAX_FRAGMENT_LENGTH / 1000).toFixed(0)} KB
            {overLimit && ` — ${t('share:options.tooLarge')}`}
          </div>
        )}

        {error && <div style={errorStyle}>{error}</div>}

        <Button variant="primary" size="lg" loading={loading} onClick={handleGenerate} disabled={overLimit} style={{ width: '100%', height: 44 }}>
          {t('share:generate')}
        </Button>
      </VStack>
    </div>
  );
}
