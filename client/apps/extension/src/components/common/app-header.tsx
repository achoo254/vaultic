// Branded header bar — ShieldCheck + "Vaultic" logo with optional right-side actions
// Matches design system header pattern (52px height, 16px horizontal padding)

import React, { useState, useEffect } from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AppHeaderProps {
  children?: React.ReactNode;
  borderBottom?: boolean;
}

export function AppHeader({ children, borderBottom }: AppHeaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

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
    <>
      <div style={headerStyle}>
        <div style={leftStyle}>
          <ShieldCheck size={22} strokeWidth={1.5} color={colors.primary} />
          <span style={titleStyle}>Vaultic</span>
        </div>
        {children && <div style={rightStyle}>{children}</div>}
      </div>
      {isOffline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
          padding: `${tokens.spacing.xs}px ${tokens.spacing.lg}px`,
          backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A',
          flexShrink: 0,
        }}>
          <WifiOff size={14} strokeWidth={1.5} color="#92400E" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: tokens.font.size.xs, color: '#92400E', fontFamily: tokens.font.family }}>
            {t('common:offline')}
          </span>
        </div>
      )}
    </>
  );
}
