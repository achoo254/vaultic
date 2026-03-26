// Single vault item card — used in VaultList
import React from 'react';
import { tokens } from '@vaultic/ui';
import { CopyButton } from '../common/copy-button';
import type { DecryptedVaultItem } from '../../stores/vault-store';

interface VaultItemCardProps {
  item: DecryptedVaultItem;
  onClick: () => void;
}

export function VaultItemCard({ item, onClick }: VaultItemCardProps) {
  const { credential } = item;
  const initial = credential.name.charAt(0).toUpperCase();
  // Generate a consistent color from the name
  const hue = credential.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={{ ...avatarStyle, backgroundColor: `hsl(${hue}, 60%, 90%)`, color: `hsl(${hue}, 60%, 40%)` }}>
        {initial}
      </div>
      <div style={infoStyle}>
        <div style={nameStyle}>{credential.name}</div>
        <div style={usernameStyle}>{credential.username || credential.url || ''}</div>
      </div>
      <div style={actionsStyle} onClick={(e) => e.stopPropagation()}>
        {credential.password && <CopyButton text={credential.password} label="🔑" />}
        {credential.url && (
          <button
            onClick={() => window.open(credential.url!.startsWith('http') ? credential.url : `https://${credential.url}`, '_blank')}
            style={iconBtn}
            title="Open URL"
          >
            ↗
          </button>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  cursor: 'pointer', borderBottom: `1px solid ${tokens.colors.border}`,
};
const avatarStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: tokens.radius.md,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
  fontFamily: tokens.font.family, flexShrink: 0,
};
const infoStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const nameStyle: React.CSSProperties = {
  fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium,
  color: tokens.colors.text, fontFamily: tokens.font.family,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const usernameStyle: React.CSSProperties = {
  fontSize: tokens.font.size.sm, color: tokens.colors.secondary, fontFamily: tokens.font.family,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const actionsStyle: React.CSSProperties = { display: 'flex', gap: 2, flexShrink: 0 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, color: tokens.colors.secondary };
