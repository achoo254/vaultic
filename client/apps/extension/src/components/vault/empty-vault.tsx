// Screen 04: Empty Vault — shown when vault has 0 items
import React from 'react';
import { Button, tokens, useTheme } from '@vaultic/ui';
import { PackageOpen, Lock, FolderOpen, Settings, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../common/app-header';
import { useAuthStore } from '../../stores/auth-store';

interface EmptyVaultProps {
  onAddItem: () => void;
  onSettings?: () => void;
  onManageFolders?: () => void;
}

export function EmptyVault({ onAddItem, onSettings, onManageFolders }: EmptyVaultProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['vault', 'common']);
  const lockVault = useAuthStore((s) => s.lock);

  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader>
        <button onClick={lockVault} style={iconBtn} title="Lock vault">
          <Lock size={18} strokeWidth={1.5} color={colors.secondary} />
        </button>
        {onManageFolders && (
          <button onClick={onManageFolders} style={iconBtn} title="Manage folders">
            <FolderOpen size={18} strokeWidth={1.5} color={colors.secondary} />
          </button>
        )}
        {onSettings && (
          <button onClick={onSettings} style={iconBtn} title="Settings">
            <Settings size={18} strokeWidth={1.5} color={colors.secondary} />
          </button>
        )}
        <button onClick={onAddItem} style={iconBtn} title="Add credential">
          <Plus size={18} strokeWidth={1.5} color={colors.primary} />
        </button>
      </AppHeader>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: tokens.spacing.lg, flex: 1, padding: tokens.spacing.xxl,
      }}>
        <PackageOpen size={48} strokeWidth={1.5} color={colors.secondary} />
        <div style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          {t('vault:empty.title')}
        </div>
        <div style={{ fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family }}>
          {t('vault:empty.description')}
        </div>
        <Button variant="primary" size="md" onClick={onAddItem}>
          {t('vault:empty.addCredential')}
        </Button>
      </div>
    </div>
  );
}
