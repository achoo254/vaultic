// Branded header bar — ShieldCheck + "Vaultic" logo with optional right-side actions
// Matches design system header pattern (52px height, 16px horizontal padding)

import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { ShieldCheck } from 'lucide-react';

interface AppHeaderProps {
  children?: React.ReactNode;
  borderBottom?: boolean;
}

export function AppHeader({ children, borderBottom }: AppHeaderProps) {
  const { colors } = useTheme();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    padding: `0 ${tokens.spacing.lg}px`,
    backgroundColor: colors.background,
    flexShrink: 0,
    ...(borderBottom && { borderBottom: `1px solid ${colors.border}` }),
  };

  const leftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.semibold,
    color: colors.text,
    fontFamily: tokens.font.family,
  };

  const rightStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
  };

  return (
    <div style={headerStyle}>
      <div style={leftStyle}>
        <ShieldCheck size={22} strokeWidth={1.5} color={colors.primary} />
        <span style={titleStyle}>Vaultic</span>
      </div>
      {children && <div style={rightStyle}>{children}</div>}
    </div>
  );
}
