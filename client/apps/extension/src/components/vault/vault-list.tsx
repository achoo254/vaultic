// Screen 05: Vault List — main popup view with search, suggested, recent, all items
import React, { useEffect, useState } from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { Lock, Settings, Plus, FolderOpen } from 'lucide-react';
import { AppHeader } from '../common/app-header';
import { useAuthStore } from '../../stores/auth-store';
import { useVaultStore, useFilteredItems } from '../../stores/vault-store';
import { SearchBar } from './search-bar';
import { EmptyVault } from './empty-vault';
import { VaultItemCard } from './vault-item-card';
import { FolderBar } from './folder-bar';
import { VaultListSkeleton } from '../common/skeleton-loader';
import type { DecryptedVaultItem } from '../../stores/vault-store';

interface VaultListProps {
  onItemClick: (id: string) => void;
  onAddItem: () => void;
  onManageFolders: () => void;
  onSettings?: () => void;
}

export function VaultList({ onItemClick, onAddItem, onManageFolders, onSettings }: VaultListProps) {
  const { colors } = useTheme();
  const lockVault = useAuthStore((s) => s.lock);
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

  const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' };
  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' };
  const scrollStyle: React.CSSProperties = { flex: 1, overflowY: 'auto' };
  const sectionTitle: React.CSSProperties = {
    fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
    color: colors.secondary, fontFamily: tokens.font.family,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
  };
  const centerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: colors.secondary, fontFamily: tokens.font.family,
  };
  const emptySearchStyle: React.CSSProperties = {
    textAlign: 'center', padding: tokens.spacing.xxl,
    color: colors.secondary, fontFamily: tokens.font.family, fontSize: tokens.font.size.base,
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <AppHeader>
          <button onClick={lockVault} style={iconBtn} title="Lock vault">
            <Lock size={18} strokeWidth={1.5} color={colors.secondary} />
          </button>
        </AppHeader>
        <VaultListSkeleton rows={4} />
      </div>
    );
  }

  if (items.length === 0 && !searchQuery) {
    return <EmptyVault onAddItem={onAddItem} onSettings={onSettings} onManageFolders={onManageFolders} />;
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

  function Section({ title, items: sectionItems, onItemClick: onClickItem }: { title: string; items: DecryptedVaultItem[]; onItemClick: (id: string) => void }) {
    if (sectionItems.length === 0) return null;
    return (
      <div>
        <div style={sectionTitle}>{title}</div>
        {sectionItems.map((item) => (
          <VaultItemCard key={item.id} item={item} onClick={() => onClickItem(item.id)} />
        ))}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <AppHeader>
        <button onClick={lockVault} style={iconBtn} title="Lock vault">
          <Lock size={18} strokeWidth={1.5} color={colors.secondary} />
        </button>
        <button onClick={onManageFolders} style={iconBtn} title="Manage folders">
          <FolderOpen size={18} strokeWidth={1.5} color={colors.secondary} />
        </button>
        {onSettings && (
          <button onClick={onSettings} style={iconBtn} title="Settings">
            <Settings size={18} strokeWidth={1.5} color={colors.secondary} />
          </button>
        )}
        <button onClick={onAddItem} style={iconBtn} title="Add credential">
          <Plus size={18} strokeWidth={1.5} color={colors.primary} />
        </button>
      </AppHeader>
      <div style={{ padding: `0 ${tokens.spacing.lg}px ${tokens.spacing.sm}px` }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
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

    </div>
  );
}
