// Bottom navigation bar — 4 tabs matching design: Generator, Vault, Share, Health
import React from 'react';
import { tokens } from '@vaultic/ui';
import { Dices, LayoutGrid, Share2, Shield } from 'lucide-react';

export type NavTab = 'generator' | 'vault' | 'share' | 'health';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; label: string; Icon: React.FC<{ size: number; strokeWidth: number; color: string }> }[] = [
  { id: 'generator', label: 'Generator', Icon: Dices },
  { id: 'vault', label: 'Vault', Icon: LayoutGrid },
  { id: 'share', label: 'Share', Icon: Share2 },
  { id: 'health', label: 'Health', Icon: Shield },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav style={navStyle}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const color = isActive ? tokens.colors.primary : tokens.colors.secondary;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{ ...tabStyle, color }}>
            <tab.Icon size={20} strokeWidth={1.5} color={color} />
            <span style={{ fontSize: tokens.font.size.xs, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
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
