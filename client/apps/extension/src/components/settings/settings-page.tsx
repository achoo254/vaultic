// Screen 19: Settings — security, cloud sync, data, account
import React, { useState, useEffect } from 'react';
import { tokens, Modal, Button, useTheme } from '@vaultic/ui';
import type { ThemeMode } from '@vaultic/ui';
import { ArrowLeft, Timer, Clipboard, Cloud, Download, Upload, User, LogOut, Sun, Moon, Monitor, RefreshCw, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { UpgradeAccountModal } from '../auth/upgrade-account-modal';
import { EnableSyncModal } from './enable-sync-modal';
import { DisableSyncModal } from './disable-sync-modal';
import { useSyncSettings } from './use-sync-settings';
import {
  SectionHeader, SettingRow, formatSyncDate,
  containerStyle, scrollStyle, syncToggleTrack, syncToggleThumb,
  useSettingsStyles,
} from './settings-page-helpers';

interface SettingsPageProps {
  onBack: () => void;
  onExport: () => void;
  onImport: () => void;
}

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: React.FC<{ size: number; strokeWidth: number; color?: string }> }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function SettingsPage({ onBack, onExport, onImport }: SettingsPageProps) {
  const { email, mode, logout } = useAuthStore();
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const [autoLockMin, setAutoLockMin] = useState(15);
  const [clipboardClearSec, setClipboardClearSec] = useState(30);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isOnline = mode === 'online';

  const saveSetting = (key: string, value: number | boolean) => {
    chrome.storage.local.set({ [key]: value });
  };

  const {
    syncEnabled, syncStatus, isSyncing, lastSyncedAt,
    showEnableSyncModal, showDisableSyncModal,
    setShowEnableSyncModal, setShowDisableSyncModal,
    handleSyncToggle, handleSyncNow, handleEnableSyncConfirm, handleDisableSync,
  } = useSyncSettings(saveSetting);

  // Load non-sync settings from chrome.storage.local
  useEffect(() => {
    chrome.storage.local.get(['auto_lock_min', 'clipboard_clear_sec']).then((r) => {
      if (r.auto_lock_min) setAutoLockMin(r.auto_lock_min);
      if (r.clipboard_clear_sec) setClipboardClearSec(r.clipboard_clear_sec);
    });
  }, []);

  const { headerStyle, backBtn, titleStyle, rowStyle, rowLabel, rowHint, selectStyle, linkRow, logoutBtn } = useSettingsStyles(colors);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={18} strokeWidth={1.5} /></button>
        <span style={titleStyle}>Settings</span>
      </div>

      <div style={scrollStyle}>
        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <div style={{ ...rowStyle, gap: tokens.spacing.sm }}>
          {THEME_OPTIONS.map((opt) => {
            const isActive = themeMode === opt.value;
            return (
              <button key={opt.value} onClick={() => setThemeMode(opt.value)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: `${tokens.spacing.sm}px`, borderRadius: tokens.radius.md, cursor: 'pointer',
                border: isActive ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                backgroundColor: isActive ? colors.surface : 'transparent',
                color: isActive ? colors.text : colors.secondary,
                fontFamily: tokens.font.family, fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.medium,
              }}>
                <opt.Icon size={16} strokeWidth={1.5} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Security */}
        <SectionHeader title="Security" />
        <SettingRow icon={<Timer size={18} strokeWidth={1.5} color={colors.secondary} />} label="Auto-lock timeout">
          <select value={autoLockMin} onChange={(e) => { const v = +e.target.value; setAutoLockMin(v); saveSetting('auto_lock_min', v); }} style={selectStyle}>
            <option value={1}>1 min</option>
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </SettingRow>
        <SettingRow icon={<Clipboard size={18} strokeWidth={1.5} color={colors.secondary} />} label="Clear clipboard after">
          <select value={clipboardClearSec} onChange={(e) => { const v = +e.target.value; setClipboardClearSec(v); saveSetting('clipboard_clear_sec', v); }} style={selectStyle}>
            <option value={10}>10 sec</option>
            <option value={30}>30 sec</option>
            <option value={60}>60 sec</option>
            <option value={0}>Never</option>
          </select>
        </SettingRow>

        {/* Cloud Sync — only show if online */}
        {isOnline && (
          <>
            <SectionHeader title="Cloud Sync" />
            <div style={{ ...rowStyle, borderBottom: syncEnabled && lastSyncedAt ? 'none' : `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <Cloud size={18} strokeWidth={1.5} color={colors.secondary} />
                <div>
                  <div style={rowLabel}>Enable Cloud Sync</div>
                  <div style={rowHint}>{syncEnabled ? 'Synced — vault data is encrypted and backed up' : syncStatus}</div>
                </div>
              </div>
              <button type="button" onClick={handleSyncToggle} style={{ ...syncToggleTrack, backgroundColor: syncEnabled ? colors.primary : colors.border }}>
                <div style={{ ...syncToggleThumb, transform: syncEnabled ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            {syncEnabled && lastSyncedAt && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
                padding: `${tokens.spacing.xs}px ${tokens.spacing.lg}px ${tokens.spacing.md}px`,
                paddingLeft: `${tokens.spacing.lg + 18 + tokens.spacing.sm}px`,
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <Clock size={14} strokeWidth={1.5} color={colors.secondary} />
                <span style={{ fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family }}>
                  Last synced: {formatSyncDate(lastSyncedAt)}
                </span>
              </div>
            )}
            {syncEnabled && (
              <button onClick={handleSyncNow} disabled={isSyncing} style={{
                ...linkRow, color: isSyncing ? colors.secondary : colors.primary,
                opacity: isSyncing ? 0.6 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer',
              }}>
                <RefreshCw size={18} strokeWidth={1.5} style={{
                  animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                }} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </>
        )}

        {/* Data */}
        <SectionHeader title="Data" />
        <button onClick={onExport} style={linkRow}>
          <Download size={18} strokeWidth={1.5} color={colors.primary} /> Export Vault
        </button>
        <button onClick={onImport} style={linkRow}>
          <Upload size={18} strokeWidth={1.5} color={colors.primary} /> Import Passwords
        </button>

        {/* Account */}
        <SectionHeader title="Account" />
        {isOnline ? (
          <>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <User size={18} strokeWidth={1.5} color={colors.secondary} />
                <div style={rowLabel}>{email}</div>
              </div>
            </div>
            <button onClick={() => logout()} style={logoutBtn}>
              <LogOut size={16} strokeWidth={1.5} /> Log out
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowUpgradeModal(true)} style={linkRow}>
              <User size={18} strokeWidth={1.5} color={colors.primary} /> Create Account
            </button>
            <button onClick={() => setShowResetConfirm(true)} style={logoutBtn}>
              <LogOut size={16} strokeWidth={1.5} /> Reset vault
            </button>
          </>
        )}
      </div>

      <UpgradeAccountModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <EnableSyncModal open={showEnableSyncModal} onClose={() => setShowEnableSyncModal(false)} onConfirm={handleEnableSyncConfirm} />

      <DisableSyncModal open={showDisableSyncModal} onClose={() => setShowDisableSyncModal(false)} onConfirm={handleDisableSync} />

      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="Reset Vault">
        <p style={{ fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family, marginBottom: tokens.spacing.lg, lineHeight: 1.5 }}>
          This will permanently delete all your vault data. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
          <Button variant="secondary" size="md" onClick={() => setShowResetConfirm(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => logout()} style={{ flex: 1, backgroundColor: colors.error }}>Reset</Button>
        </div>
      </Modal>
    </div>
  );
}

