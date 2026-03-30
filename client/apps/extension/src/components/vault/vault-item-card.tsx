// Single vault item card — used in VaultList
import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { IconWorld, IconExternalLink } from '@tabler/icons-react';
import { CopyButton } from '../common/copy-button';
import type { DecryptedVaultItem } from '../../stores/vault-store';

interface VaultItemCardProps {
  item: DecryptedVaultItem;
  onClick: () => void;
}

export function VaultItemCard({ item, onClick }: VaultItemCardProps) {
  const { colors } = useTheme();
  const { credential } = item;

  const cardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    cursor: 'pointer', borderBottom: `1px solid ${colors.border}`,
  };
  const avatarStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: tokens.radius.md,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)', flexShrink: 0,
  };
  const infoStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
  const nameStyle: React.CSSProperties = {
    fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium,
    color: colors.text, fontFamily: tokens.font.family,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };
  const usernameStyle: React.CSSProperties = {
    fontSize: tokens.font.size.sm, color: colors.secondary, fontFamily: tokens.font.family,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };
  const actionsStyle: React.CSSProperties = { display: 'flex', gap: 2, flexShrink: 0 };
  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, color: colors.secondary };

  return (
    <div style={cardStyle} onClick={onClick}>
      {/* Blue rounded-square globe avatar matching design */}
      <div style={avatarStyle}>
        <IconWorld size={20} stroke={1.5} color={colors.primary} />
      </div>
      <div style={infoStyle}>
        <div style={nameStyle}>{credential.name}</div>
        <div style={usernameStyle}>{credential.username || credential.url || ''}</div>
      </div>
      <div style={actionsStyle} onClick={(e) => e.stopPropagation()}>
        {credential.password && <CopyButton text={credential.password} size={16} />}
        {credential.url && (
          <button
            onClick={() => window.open(credential.url!.startsWith('http') ? credential.url : `https://${credential.url}`, '_blank')}
            style={iconBtn}
            title="Open URL"
          >
            <IconExternalLink size={16} stroke={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
