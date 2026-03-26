// Bottom navigation bar — 4 tabs: Vault, Generator, Share, Settings
import React from 'react';
import { tokens } from '@vaultic/ui';

export type NavTab = 'vault' | 'generator' | 'share' | 'settings';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; icon: string; label: string }[] = [
  { id: 'vault', icon: '🔐', label: 'Vault' },
  { id: 'generator', icon: '🎲', label: 'Generator' },
  { id: 'share', icon: '🔗', label: 'Share' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav style={navStyle}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            ...tabStyle,
            color: active === tab.id ? tokens.colors.primary : tokens.colors.secondary,
          }}
        >
          <span style={{ fontSize: 18 }}>{tab.icon}</span>
          <span style={{ fontSize: tokens.font.size.xs }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  borderTop: `1px solid ${tokens.colors.border}`,
  backgroundColor: tokens.colors.background,
  flexShrink: 0,
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: `${tokens.spacing.sm}px 0`,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: tokens.font.family,
};
