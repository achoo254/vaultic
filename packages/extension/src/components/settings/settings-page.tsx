// Screen 19: Settings — security, cloud sync, data, account
import React, { useState, useEffect } from 'react';
import { tokens, VStack, SectionHeader as SharedSectionHeader } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';

interface SettingsPageProps {
  onBack: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsPage({ onBack, onExport, onImport }: SettingsPageProps) {
  const { email, logout } = useAuthStore();
  const [autoLockMin, setAutoLockMin] = useState(15);
  const [clipboardClearSec, setClipboardClearSec] = useState(30);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Local only');

  // Load settings from chrome.storage.local
  useEffect(() => {
    chrome.storage.local.get(['auto_lock_min', 'clipboard_clear_sec', 'sync_enabled']).then((r) => {
      if (r.auto_lock_min) setAutoLockMin(r.auto_lock_min);
      if (r.clipboard_clear_sec) setClipboardClearSec(r.clipboard_clear_sec);
      if (r.sync_enabled) { setSyncEnabled(true); setSyncStatus('Synced'); }
    });
  }, []);

  const saveSetting = (key: string, value: number | boolean) => {
    chrome.storage.local.set({ [key]: value });
  };

  const handleSyncToggle = async () => {
    if (!syncEnabled) {
      // Enabling sync
      if (confirm('Your encrypted vault will be stored on the server. Only you can decrypt it. Enable Cloud Sync?')) {
        setSyncEnabled(true);
        setSyncStatus('Syncing...');
        saveSetting('sync_enabled', true);
        // TODO: trigger full vault push
        setTimeout(() => setSyncStatus('Synced'), 2000);
      }
    } else {
      // Disabling sync
      const deleteData = confirm('Delete your vault data from the server? (Cancel to keep a frozen copy)');
      setSyncEnabled(false);
      setSyncStatus('Local only');
      saveSetting('sync_enabled', false);
      if (deleteData) {
        // TODO: call DELETE /api/sync/purge
      }
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={titleStyle}>Settings</span>
      </div>

      <div style={scrollStyle}>
        {/* Security */}
        <SectionHeader title="Security" />
        <SettingRow label="Auto-lock timeout" value={`${autoLockMin} min`}>
          <select value={autoLockMin} onChange={(e) => { const v = +e.target.value; setAutoLockMin(v); saveSetting('auto_lock_min', v); }} style={selectStyle}>
            <option value={1}>1 min</option>
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </SettingRow>
        <SettingRow label="Clear clipboard after" value={`${clipboardClearSec}s`}>
          <select value={clipboardClearSec} onChange={(e) => { const v = +e.target.value; setClipboardClearSec(v); saveSetting('clipboard_clear_sec', v); }} style={selectStyle}>
            <option value={10}>10 sec</option>
            <option value={30}>30 sec</option>
            <option value={60}>60 sec</option>
            <option value={0}>Never</option>
          </select>
        </SettingRow>

        {/* Cloud Sync */}
        <SectionHeader title="Cloud Sync" />
        <div style={rowStyle}>
          <div>
            <div style={rowLabel}>Enable Cloud Sync</div>
            <div style={rowHint}>{syncStatus}</div>
          </div>
          <label style={toggleLabel}>
            <input type="checkbox" checked={syncEnabled} onChange={handleSyncToggle} />
          </label>
        </div>

        {/* Data */}
        <SectionHeader title="Data" />
        <button onClick={onExport} style={linkRow}>Export Vault</button>
        <button onClick={onImport} style={linkRow}>Import Passwords</button>

        {/* Account */}
        <SectionHeader title="Account" />
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={rowLabel}>{email}</div>
        </div>
        <button onClick={() => logout()} style={logoutBtn}>Log out</button>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <SharedSectionHeader style={{ padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px ${tokens.spacing.xs}px` }}>
      {title}
    </SharedSectionHeader>
  );
}

function SettingRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <div style={rowLabel}>{label}</div>
      {children}
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  borderBottom: `1px solid ${tokens.colors.border}`,
};
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: tokens.colors.text, padding: 4 };
const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const scrollStyle: React.CSSProperties = { flex: 1, overflowY: 'auto' };
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  borderBottom: `1px solid ${tokens.colors.border}`,
};
const rowLabel: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family };
const rowHint: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family, marginTop: 2 };
const selectStyle: React.CSSProperties = {
  fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, color: tokens.colors.text,
  border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.sm,
  padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`, backgroundColor: tokens.colors.background,
};
const toggleLabel: React.CSSProperties = { cursor: 'pointer' };
const linkRow: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  borderBottom: `1px solid ${tokens.colors.border}`,
  background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: tokens.colors.border,
  fontSize: tokens.font.size.base, color: tokens.colors.primary, fontFamily: tokens.font.family, cursor: 'pointer',
};
const logoutBtn: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  background: 'none', border: 'none',
  fontSize: tokens.font.size.base, color: tokens.colors.error, fontFamily: tokens.font.family, cursor: 'pointer',
};
