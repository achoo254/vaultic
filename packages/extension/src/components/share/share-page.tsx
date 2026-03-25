// Screen 13/14: Share Page — toggle between "From Vault" and "Quick Share"
import React, { useState } from 'react';
import { Button } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { ShareOptions } from './share-options';
import { ShareLinkResult } from './share-link-result';
import { encryptForShare } from '../../lib/share-crypto';
import { useVaultStore } from '../../stores/vault-store';
import type { DecryptedVaultItem } from '../../stores/vault-store';
import { fetchWithAuth } from '../../lib/fetch-with-auth';

const SHARE_BASE_URL = import.meta.env.VITE_SHARE_URL || 'http://localhost:8080/s';

export function SharePage() {
  const [mode, setMode] = useState<'vault' | 'quick'>('vault');
  const [ttlHours, setTtlHours] = useState<number | null>(24);
  const [maxViews, setMaxViews] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; ttl: number | null; views: number | null } | null>(null);

  // From Vault state
  const [selectedItem, setSelectedItem] = useState<DecryptedVaultItem | null>(null);
  const [shareUsername, setShareUsername] = useState(true);
  const [sharePassword, setSharePassword] = useState(true);

  // Quick Share state
  const [quickText, setQuickText] = useState('');

  const items = useVaultStore((s) => s.items);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      let plaintext: string;
      if (mode === 'vault') {
        if (!selectedItem) { setError('Select a credential'); setLoading(false); return; }
        const shared: Record<string, string> = {};
        if (shareUsername) shared.username = selectedItem.credential.username || '';
        if (sharePassword) shared.password = selectedItem.credential.password || '';
        shared.name = selectedItem.credential.name;
        plaintext = JSON.stringify(shared);
      } else {
        if (!quickText.trim()) { setError('Enter text to share'); setLoading(false); return; }
        plaintext = quickText;
      }

      const { encryptedData, keyFragment } = await encryptForShare(plaintext);

      const res = await fetchWithAuth('/api/share', {
        method: 'POST',
        body: JSON.stringify({
          encrypted_data: encryptedData,
          ttl_hours: ttlHours,
          max_views: maxViews,
        }),
      });
      const data = await res.json();

      const shareUrl = `${SHARE_BASE_URL}/${data.share_id}#${keyFragment}`;
      setResult({ url: shareUrl, ttl: ttlHours, views: maxViews });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <ShareLinkResult
        shareUrl={result.url}
        ttlHours={result.ttl}
        maxViews={result.views}
        onDone={() => setResult(null)}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {/* Segmented toggle */}
      <div style={toggleRow}>
        <button style={mode === 'vault' ? activeToggle : inactiveToggle} onClick={() => setMode('vault')}>
          From Vault
        </button>
        <button style={mode === 'quick' ? activeToggle : inactiveToggle} onClick={() => setMode('quick')}>
          Quick Share
        </button>
      </div>

      <div style={contentStyle}>
        {mode === 'vault' ? (
          <div style={sectionStyle}>
            {!selectedItem ? (
              <div style={itemList}>
                {items.length === 0 && <div style={emptyStyle}>No items in vault</div>}
                {items.slice(0, 10).map((item) => (
                  <button key={item.id} onClick={() => setSelectedItem(item)} style={itemBtn}>
                    <span style={itemName}>{item.credential.name}</span>
                    <span style={itemUser}>{item.credential.username}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div style={selectedCard}>
                  <span style={itemName}>{selectedItem.credential.name}</span>
                  <button onClick={() => setSelectedItem(null)} style={changeBtn}>Change</button>
                </div>
                <label style={checkboxRow}>
                  <input type="checkbox" checked={shareUsername} onChange={(e) => setShareUsername(e.target.checked)} />
                  <span>Username</span>
                </label>
                <label style={checkboxRow}>
                  <input type="checkbox" checked={sharePassword} onChange={(e) => setSharePassword(e.target.checked)} />
                  <span>Password</span>
                </label>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder="Paste any secret here..."
            style={textareaStyle}
            rows={5}
          />
        )}

        <ShareOptions ttlHours={ttlHours} maxViews={maxViews} onTtlChange={setTtlHours} onMaxViewsChange={setMaxViews} />

        {error && <div style={errorStyle}>{error}</div>}

        <Button variant="primary" size="lg" loading={loading} onClick={handleGenerate} style={{ width: '100%' }}>
          Generate Secure Link
        </Button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', padding: tokens.spacing.lg, gap: tokens.spacing.lg };
const toggleRow: React.CSSProperties = { display: 'flex', backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.md, padding: 2 };
const activeToggle: React.CSSProperties = {
  flex: 1, padding: `${tokens.spacing.sm}px`, borderRadius: tokens.radius.sm,
  backgroundColor: tokens.colors.background, color: tokens.colors.text,
  border: 'none', cursor: 'pointer', fontWeight: tokens.font.weight.medium,
  fontFamily: tokens.font.family, fontSize: tokens.font.size.sm,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
};
const inactiveToggle: React.CSSProperties = {
  ...activeToggle, backgroundColor: 'transparent', color: tokens.colors.secondary, boxShadow: 'none',
};
const contentStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg, flex: 1, overflowY: 'auto' };
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm };
const itemList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 150, overflowY: 'auto' };
const itemBtn: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
  border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.sm,
  backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: tokens.font.family,
};
const itemName: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontWeight: tokens.font.weight.medium };
const itemUser: React.CSSProperties = { fontSize: tokens.font.size.sm, color: tokens.colors.secondary };
const selectedCard: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: tokens.spacing.md, backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.md,
};
const changeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: tokens.colors.primary, cursor: 'pointer',
  fontSize: tokens.font.size.sm, fontFamily: tokens.font.family,
};
const checkboxRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  fontSize: tokens.font.size.base, fontFamily: tokens.font.family, color: tokens.colors.text,
  padding: `${tokens.spacing.xs}px 0`, cursor: 'pointer',
};
const textareaStyle: React.CSSProperties = {
  fontFamily: tokens.font.family, fontSize: tokens.font.size.base, color: tokens.colors.text,
  border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md,
  padding: tokens.spacing.md, resize: 'vertical', outline: 'none',
};
const errorStyle: React.CSSProperties = { color: tokens.colors.error, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family };
const emptyStyle: React.CSSProperties = { color: tokens.colors.secondary, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, textAlign: 'center', padding: tokens.spacing.lg };
