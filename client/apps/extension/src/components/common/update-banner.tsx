// Update banner — compact notification bar shown when a new sideload version is available

import React from 'react';
import { IconDownload, IconX } from '@tabler/icons-react';
import { tokens, useTheme } from '@vaultic/ui';

interface UpdateBannerProps {
  version: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, onUpdate, onDismiss }: UpdateBannerProps) {
  const { colors } = useTheme();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
    backgroundColor: colors.primaryBg,
    borderBottom: `1px solid ${colors.border}`,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.sm,
    minHeight: '36px',
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    color: colors.primary,
    fontWeight: tokens.font.weight.medium,
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: `2px ${tokens.spacing.sm}`,
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: tokens.radius.sm,
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.medium,
    cursor: 'pointer',
    fontFamily: tokens.font.family,
  };

  const dismissStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.secondary,
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div style={containerStyle}>
      <span style={textStyle}>v{version} available</span>
      <button style={btnStyle} onClick={onUpdate}>
        <IconDownload size={14} stroke={1.5} />
        Update
      </button>
      <button style={dismissStyle} onClick={onDismiss} aria-label="Dismiss update">
        <IconX size={14} stroke={1.5} />
      </button>
    </div>
  );
}
