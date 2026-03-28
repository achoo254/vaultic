// Screen 04: Empty Vault — shown when vault has 0 items
import React from 'react';
import { Button, tokens, useTheme } from '@vaultic/ui';
import { PackageOpen } from 'lucide-react';
import { AppHeader } from '../common/app-header';

interface EmptyVaultProps {
  onAddItem: () => void;
}

export function EmptyVault({ onAddItem }: EmptyVaultProps) {
  const { colors } = useTheme();

  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: tokens.spacing.lg, flex: 1, padding: tokens.spacing.xxl,
  };
  const titleStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.semibold,
    color: colors.text, fontFamily: tokens.font.family,
  };
  const subtitleStyle: React.CSSProperties = {
    fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader />
      <div style={containerStyle}>
        <PackageOpen size={48} strokeWidth={1.5} color={colors.secondary} />
      <div style={titleStyle}>Your vault is empty</div>
      <div style={subtitleStyle}>Add your first credential to get started</div>
      <Button variant="primary" size="md" onClick={onAddItem}>
        + Add Credential
      </Button>
      </div>
    </div>
  );
}
