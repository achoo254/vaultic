// Bottom navigation bar — 4 tabs matching design: Generator, Vault, Share, Health
import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { IconDice, IconLayoutGrid, IconShare, IconShield } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export type NavTab = 'generator' | 'vault' | 'share' | 'health';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

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

export function BottomNav({ active, onChange }: BottomNavProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  const tabs: { id: NavTab; label: string; Icon: React.FC<{ size: number; stroke: number; color: string }> }[] = [
    { id: 'generator', label: t('common:nav.generator'), Icon: IconDice },
    { id: 'vault', label: t('common:nav.vault'), Icon: IconLayoutGrid },
    { id: 'share', label: t('common:nav.share'), Icon: IconShare },
    { id: 'health', label: t('common:nav.health'), Icon: IconShield },
  ];

  const navStyle: React.CSSProperties = {
    display: 'flex',
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    flexShrink: 0,
  };

  return (
    <nav style={navStyle}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const color = isActive ? colors.primary : colors.secondary;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{ ...tabStyle, color }}>
            <tab.Icon size={20} stroke={1.5} color={color} />
            <span style={{ fontSize: tokens.font.size.xs, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
