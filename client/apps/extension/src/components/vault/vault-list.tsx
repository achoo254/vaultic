// Screen 05: Vault List — main popup view with search, suggested, recent, all items
import React, { useEffect, useState } from 'react';
import { tokens } from '@vaultic/ui';
import { Settings, Plus } from 'lucide-react';
import { useVaultStore, useFilteredItems } from '../../stores/vault-store';
import { SearchBar } from './search-bar';
import { EmptyVault } from './empty-vault';
import { VaultItemCard } from './vault-item-card';
import { FolderBar } from './folder-bar';
import type { DecryptedVaultItem } from '../../stores/vault-store';

interface VaultListProps {
  onItemClick: (id: string) => void;
  onAddItem: () => void;
  onManageFolders: () => void;
  onSettings?: () => void;
}

export function VaultList({ onItemClick, onAddItem, onManageFolders, onSettings }: VaultListProps) {
  const { items, searchQuery, setSearchQuery, loadVault, loading } = useVaultStore();
  const filtered = useFilteredItems();
  const [currentHost, setCurrentHost] = useState('');

  useEffect(() => {
    loadVault();
    // Get current tab URL for suggestions
    chrome.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
      try {
        if (tabs[0]?.url) setCurrentHost(new URL(tabs[0].url).hostname);
      } catch { /* ignore invalid URLs */ }
    }).catch(() => {});
  }, [loadVault]);

  if (loading) {
    return <div style={centerStyle}>Loading vault...</div>;
  }

  if (items.length === 0 && !searchQuery) {
    return <EmptyVault onAddItem={onAddItem} />;
  }

  // Split into suggested (matching current site) and rest
  const suggested = currentHost
    ? filtered.filter((i) => i.credential.url?.includes(currentHost))
    : [];
  const recent = [...filtered]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);
  const suggestedIds = new Set(suggested.map((i) => i.id));
  const recentIds = new Set(recent.map((i) => i.id));

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ flex: 1 }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        {onSettings && (
          <button onClick={onSettings} style={settingsBtn} title="Settings">
            <Settings size={20} strokeWidth={1.5} color={tokens.colors.secondary} />
          </button>
        )}
      </div>
      <FolderBar onManageFolders={onManageFolders} />

      <div style={scrollStyle}>
        {suggested.length > 0 && (
          <Section title="Suggested" items={suggested} onItemClick={onItemClick} />
        )}

        {!searchQuery && recent.length > 0 && (
          <Section title="Recent" items={recent.filter((i) => !suggestedIds.has(i.id))} onItemClick={onItemClick} />
        )}

        <Section
          title={searchQuery ? 'Results' : 'All Items'}
          items={filtered.filter((i) => !suggestedIds.has(i.id) && (!recentIds.has(i.id) || searchQuery))}
          onItemClick={onItemClick}
        />

        {filtered.length === 0 && searchQuery && (
          <div style={emptySearchStyle}>No items found for "{searchQuery}"</div>
        )}
      </div>

      <button onClick={onAddItem} style={fabStyle} title="Add credential">
        <Plus size={24} strokeWidth={2} color="#fff" />
      </button>
    </div>
  );
}

function Section({ title, items, onItemClick }: { title: string; items: DecryptedVaultItem[]; onItemClick: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div style={sectionTitle}>{title}</div>
      {items.map((item) => (
        <VaultItemCard key={item.id} item={item} onClick={() => onItemClick(item.id)} />
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' };
const headerStyle: React.CSSProperties = { padding: tokens.spacing.md, display: 'flex', alignItems: 'center', gap: tokens.spacing.sm };
const settingsBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' };
const scrollStyle: React.CSSProperties = { flex: 1, overflowY: 'auto' };
const sectionTitle: React.CSSProperties = {
  fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
  color: tokens.colors.secondary, fontFamily: tokens.font.family,
  padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
  textTransform: 'uppercase' as const, letterSpacing: 0.5,
};
const centerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: '100%', color: tokens.colors.secondary, fontFamily: tokens.font.family,
};
const emptySearchStyle: React.CSSProperties = {
  textAlign: 'center', padding: tokens.spacing.xxl,
  color: tokens.colors.secondary, fontFamily: tokens.font.family, fontSize: tokens.font.size.base,
};
const fabStyle: React.CSSProperties = {
  position: 'absolute', bottom: 16, right: 16, width: 44, height: 44,
  borderRadius: tokens.radius.full, backgroundColor: tokens.colors.primary,
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};
