// Screen 19: Settings — security, cloud sync, data, account
import React, { useState, useEffect } from 'react';
import { tokens, Modal, Button, useTheme, useI18n } from '@vaultic/ui';
import type { ThemeMode, Language } from '@vaultic/ui';
import { IconArrowLeft, IconClock, IconClipboard, IconCloud, IconDownload, IconUpload, IconUser, IconLogout, IconSun, IconMoon, IconDeviceDesktop, IconRefresh, IconLanguage } from '@tabler/icons-react';
import { languageLabels, supportedLanguages } from '../../i18n/i18n-config';
import { pushPreferencesToServer } from '../../lib/sync-preferences';
import { useTranslation } from 'react-i18next';
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

export function SettingsPage({ onBack, onExport, onImport }: SettingsPageProps) {
  const { email, mode, logout } = useAuthStore();
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const { language, setLanguage } = useI18n();
  const { t } = useTranslation(['settings', 'common']);
  const [autoLockMin, setAutoLockMin] = useState(15);
  const [clipboardClearSec, setClipboardClearSec] = useState(30);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isOnline = mode === 'online';

  // Theme options defined inside component to access t()
  const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: React.FC<{ size: number; stroke: number; color?: string }> }[] = [
    { value: 'light', label: t('settings:theme.light'), Icon: IconSun },
    { value: 'dark', label: t('settings:theme.dark'), Icon: IconMoon },
    { value: 'system', label: t('settings:theme.system'), Icon: IconDeviceDesktop },
  ];

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
        <button onClick={onBack} style={backBtn}><IconArrowLeft size={18} stroke={1.5} /></button>
        <span style={titleStyle}>{t('settings:title')}</span>
      </div>

      <div style={scrollStyle}>
        {/* Appearance */}
        <SectionHeader title={t('settings:appearance')} />
        <div style={{ ...rowStyle, gap: tokens.spacing.sm }}>
          {THEME_OPTIONS.map((opt) => {
            const isActive = themeMode === opt.value;
            return (
              <button key={opt.value} onClick={() => { setThemeMode(opt.value); pushPreferencesToServer({ theme: opt.value }); }} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: `${tokens.spacing.sm}px`, borderRadius: tokens.radius.md, cursor: 'pointer',
                border: isActive ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                backgroundColor: isActive ? colors.surface : 'transparent',
                color: isActive ? colors.text : colors.secondary,
                fontFamily: tokens.font.family, fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.medium,
              }}>
                <opt.Icon size={16} stroke={1.5} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Language */}
        <SectionHeader title={t('settings:language')} />
        <SettingRow icon={<IconLanguage size={18} stroke={1.5} color={colors.secondary} />} label={t('settings:language.display')}>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} style={selectStyle}>
            {supportedLanguages.map((lang) => (
              <option key={lang} value={lang}>{languageLabels[lang].nativeLabel}</option>
            ))}
          </select>
        </SettingRow>

        {/* Security */}
        <SectionHeader title={t('settings:security')} />
        <SettingRow icon={<IconClock size={18} stroke={1.5} color={colors.secondary} />} label={t('settings:security.autoLock')}>
          <select value={autoLockMin} onChange={(e) => { const v = +e.target.value; setAutoLockMin(v); saveSetting('auto_lock_min', v); }} style={selectStyle}>
            <option value={1}>{t('settings:security.autoLock.1min')}</option>
            <option value={5}>{t('settings:security.autoLock.5min')}</option>
            <option value={15}>{t('settings:security.autoLock.15min')}</option>
            <option value={30}>{t('settings:security.autoLock.30min')}</option>
            <option value={60}>{t('settings:security.autoLock.1hour')}</option>
          </select>
        </SettingRow>
        <SettingRow icon={<IconClipboard size={18} stroke={1.5} color={colors.secondary} />} label={t('settings:security.clipboardClear')}>
          <select value={clipboardClearSec} onChange={(e) => { const v = +e.target.value; setClipboardClearSec(v); saveSetting('clipboard_clear_sec', v); }} style={selectStyle}>
            <option value={10}>{t('settings:security.clipboard.10sec')}</option>
            <option value={30}>{t('settings:security.clipboard.30sec')}</option>
            <option value={60}>{t('settings:security.clipboard.60sec')}</option>
            <option value={0}>{t('settings:security.clipboard.never')}</option>
          </select>
        </SettingRow>

        {/* Cloud Sync — only show if online */}
        {isOnline && (
          <>
            <SectionHeader title={t('settings:sync.title')} />
            <div style={{ ...rowStyle, borderBottom: syncEnabled && lastSyncedAt ? 'none' : `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <IconCloud size={18} stroke={1.5} color={colors.secondary} />
                <div>
                  <div style={rowLabel}>{t('settings:sync.enable')}</div>
                  <div style={rowHint}>{syncEnabled ? t('settings:sync.statusSynced') : syncStatus}</div>
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
                <IconClock size={14} stroke={1.5} color={colors.secondary} />
                <span style={{ fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family }}>
                  {t('settings:sync.lastSynced', { time: formatSyncDate(lastSyncedAt) })}
                </span>
              </div>
            )}
            {syncEnabled && (
              <button onClick={handleSyncNow} disabled={isSyncing} style={{
                ...linkRow, color: isSyncing ? colors.secondary : colors.primary,
                opacity: isSyncing ? 0.6 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer',
              }}>
                <IconRefresh size={18} stroke={1.5} style={{
                  animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                }} />
                {isSyncing ? t('settings:sync.syncing') : t('settings:sync.syncNow')}
              </button>
            )}
          </>
        )}

        {/* Data */}
        <SectionHeader title={t('settings:data')} />
        <button onClick={onExport} style={linkRow}>
          <IconDownload size={18} stroke={1.5} color={colors.primary} /> {t('settings:data.export')}
        </button>
        <button onClick={onImport} style={linkRow}>
          <IconUpload size={18} stroke={1.5} color={colors.primary} /> {t('settings:data.import')}
        </button>

        {/* Account */}
        <SectionHeader title={t('settings:account')} />
        {isOnline ? (
          <>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <IconUser size={18} stroke={1.5} color={colors.secondary} />
                <div style={rowLabel}>{email}</div>
              </div>
            </div>
            <button onClick={() => logout()} style={logoutBtn}>
              <IconLogout size={16} stroke={1.5} /> {t('settings:account.logout')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowUpgradeModal(true)} style={linkRow}>
              <IconUser size={18} stroke={1.5} color={colors.primary} /> {t('settings:account.createAccount')}
            </button>
            <button onClick={() => setShowResetConfirm(true)} style={logoutBtn}>
              <IconLogout size={16} stroke={1.5} /> {t('settings:account.resetVault')}
            </button>
          </>
        )}
      </div>

      <UpgradeAccountModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <EnableSyncModal open={showEnableSyncModal} onClose={() => setShowEnableSyncModal(false)} onConfirm={handleEnableSyncConfirm} />
      <DisableSyncModal open={showDisableSyncModal} onClose={() => setShowDisableSyncModal(false)} onConfirm={handleDisableSync} />

      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title={t('settings:account.resetTitle')}>
        <p style={{ fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family, marginBottom: tokens.spacing.lg, lineHeight: 1.5 }}>
          {t('settings:account.resetMessage')}
        </p>
        <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
          <Button variant="secondary" size="md" onClick={() => setShowResetConfirm(false)} style={{ flex: 1 }}>{t('common:cancel')}</Button>
          <Button variant="primary" size="md" onClick={() => logout()} style={{ flex: 1, backgroundColor: colors.error }}>{t('common:reset')}</Button>
        </div>
      </Modal>
    </div>
  );
}
