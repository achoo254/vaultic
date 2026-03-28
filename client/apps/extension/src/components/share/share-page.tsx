// Screen 13/14: Share Page — unified hybrid share (data in URL, metadata on server)
import React, { useState } from 'react';
import { Button, VStack, Checkbox, Textarea, ToggleGroup, Card, tokens, useTheme } from '@vaultic/ui';
import { isWithinUrlLimit, estimateFragmentSize, MAX_FRAGMENT_LENGTH } from '@vaultic/crypto';
import { ShareOptions } from './share-options';
import { ShareLinkResult } from './share-link-result';
import { encryptShareToUrl } from '../../lib/share-crypto';
import { useVaultStore } from '../../stores/vault-store';
import { useAuthStore } from '../../stores/auth-store';
import type { DecryptedVaultItem } from '../../stores/vault-store';
import { fetchWithAuth } from '../../lib/fetch-with-auth';

const SHARE_BASE_URL = import.meta.env.VITE_SHARE_URL || 'http://localhost:8080/s';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const MODE_OPTIONS = [
  { value: 'vault' as const, label: 'From Vault' },
  { value: 'quick' as const, label: 'Quick Share' },
];

export function SharePage() {
  const { colors } = useTheme();
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
      setError(mode === 'vault' ? 'Select a credential' : 'Enter text to share');
      return;
    }
    if (overLimit) {
      setError('Data too large for URL share. Reduce notes or fields.');
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
        warning: metadataFailed ? 'Link created but access controls (expiry/view limit) could not be set.' : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setLoading(false);
    }
  };

  const itemBtn: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    border: `1px solid ${colors.border}`, borderRadius: tokens.radius.sm,
    backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: tokens.font.family,
  };
  const itemName: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.text, fontWeight: tokens.font.weight.medium };
  const itemUser: React.CSSProperties = { fontSize: tokens.font.size.sm, color: colors.secondary };
  const changeBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: colors.primary, cursor: 'pointer',
    fontSize: tokens.font.size.sm, fontFamily: tokens.font.family,
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
    <VStack gap="lg" style={{ height: '100%', padding: tokens.spacing.lg }}>
      <ToggleGroup options={MODE_OPTIONS} value={mode} onChange={(v) => setMode(v)} />

      <VStack gap="lg" style={{ flex: 1, overflowY: 'auto' }}>
        {mode === 'vault' ? (
          <VStack gap="sm">
            {!selectedItem ? (
              <VStack gap="xs" style={{ maxHeight: 150, overflowY: 'auto' }}>
                {items.length === 0 && <div style={emptyStyle}>No items in vault</div>}
                {items.slice(0, 10).map((item) => (
                  <button key={item.id} onClick={() => setSelectedItem(item)} style={itemBtn}>
                    <span style={itemName}>{item.credential.name}</span>
                    <span style={itemUser}>{item.credential.username}</span>
                  </button>
                ))}
              </VStack>
            ) : (
              <VStack gap="xs">
                <Card variant="filled" padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={itemName}>{selectedItem.credential.name}</span>
                  <button onClick={() => setSelectedItem(null)} style={changeBtn}>Change</button>
                </Card>
                <Checkbox checked={shareUsername} onChange={setShareUsername} label="Username" />
                <Checkbox checked={sharePassword} onChange={setSharePassword} label="Password" />
              </VStack>
            )}
          </VStack>
        ) : (
          <Textarea
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder="Paste any secret here..."
            rows={5}
          />
        )}

        <ShareOptions ttlHours={ttlHours} maxViews={maxViews} onTtlChange={setTtlHours} onMaxViewsChange={setMaxViews} />

        {/* Size indicator */}
        {plaintextBytes > 0 && (
          <div style={{ fontSize: tokens.font.size.xs, color: overLimit ? colors.error : colors.secondary, fontFamily: tokens.font.family }}>
            ~{(estimatedSize / 1000).toFixed(1)} KB / {(MAX_FRAGMENT_LENGTH / 1000).toFixed(0)} KB
            {overLimit && ' — too large'}
          </div>
        )}

        {error && <div style={errorStyle}>{error}</div>}

        <Button variant="primary" size="lg" loading={loading} onClick={handleGenerate} disabled={overLimit} style={{ width: '100%' }}>
          Generate Secure Link
        </Button>
      </VStack>
    </VStack>
  );
}
