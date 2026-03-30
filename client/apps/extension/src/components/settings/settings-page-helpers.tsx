// Sub-components, style constants, and formatting utilities for SettingsPage
// Extracted to keep settings-page.tsx under 200 lines

import React from 'react';
import { tokens, SectionHeader as SharedSectionHeader, useTheme } from '@vaultic/ui';
import type { ThemeColors } from '@vaultic/ui';

export function SectionHeader({ title }: { title: string }) {
  return (
    <SharedSectionHeader style={{ padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px ${tokens.spacing.xs}px` }}>
      {title}
    </SharedSectionHeader>
  );
}

export function SettingRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
        {icon}
        <div style={{ fontSize: tokens.font.size.base, color: colors.text, fontFamily: tokens.font.family }}>{label}</div>
      </div>
      {children}
    </div>
  );
}

/** Format ISO timestamp to "DD/MM/YYYY HH:mm:ss" for last synced display. */
export function formatSyncDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
export const scrollStyle: React.CSSProperties = { flex: 1, overflowY: 'auto' };
export const syncToggleTrack: React.CSSProperties = {
  width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
  position: 'relative', transition: 'background-color 0.2s', padding: 2,
  display: 'flex', alignItems: 'center',
};
export const syncToggleThumb: React.CSSProperties = {
  width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
  transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};

/** Theme-aware styles for SettingsPage — call inside component to access colors. */
export function useSettingsStyles(colors: ThemeColors) {
  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    borderBottom: `1px solid ${colors.border}`,
  };
  const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex', alignItems: 'center' };
  const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family };
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    borderBottom: `1px solid ${colors.border}`,
  };
  const rowLabel: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.text, fontFamily: tokens.font.family };
  const rowHint: React.CSSProperties = { fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family, marginTop: 2 };
  const selectStyle: React.CSSProperties = {
    fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, color: colors.text,
    border: `1px solid ${colors.border}`, borderRadius: tokens.radius.sm,
    padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`, backgroundColor: colors.background,
  };
  const linkRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, width: '100%', textAlign: 'left',
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    background: 'none', border: 'none', borderBottom: `1px solid ${colors.border}`,
    fontSize: tokens.font.size.base, color: colors.primary, fontFamily: tokens.font.family, cursor: 'pointer',
  };
  const logoutBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, width: '100%', textAlign: 'left',
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    background: 'none', border: 'none',
    fontSize: tokens.font.size.base, color: colors.error, fontFamily: tokens.font.family, cursor: 'pointer',
  };
  return { headerStyle, backBtn, titleStyle, rowStyle, rowLabel, rowHint, selectStyle, linkRow, logoutBtn };
}
