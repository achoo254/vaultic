// Screen 19: Settings — security, cloud sync, data, account
import React, { useState, useEffect } from 'react';
import { tokens, VStack, SectionHeader as SharedSectionHeader } from '@vaultic/ui';
import { ArrowLeft, Timer, Clipboard, Cloud, Download, Upload, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { fetchWithAuth } from '../../lib/fetch-with-auth';
import { IndexedDBStore } from '@vaultic/storage';
import { UpgradeAccountForm } from './upgrade-account-form';

interface SettingsPageProps {
  onBack: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsPage({ onBack, onExport, onImport }: SettingsPageProps) {
  const { email, mode, logout } = useAuthStore();
  const [autoLockMin, setAutoLockMin] = useState(15);
  const [clipboardClearSec, setClipboardClearSec] = useState(30);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Local only');

  const isOnline = mode === 'online';

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
      if (confirm('Your encrypted vault will be stored on the server. Only you can decrypt it. Enable Cloud Sync?')) {
        setSyncEnabled(true);
        setSyncStatus('Syncing...');
        saveSetting('sync_enabled', true);
        try {
          const store = new IndexedDBStore();
          const items = await store.getAllItems();
          await fetchWithAuth('/api/v1/sync/push', {
            method: 'POST',
            body: JSON.stringify({ device_id: '', items }),
          });
          setSyncStatus('Synced');
        } catch {
          setSyncStatus('Sync failed');
        }
      }
    } else {
      const deleteData = confirm('Delete your vault data from the server? (Cancel to keep a frozen copy)');
      setSyncEnabled(false);
      setSyncStatus('Local only');
      saveSetting('sync_enabled', false);
      if (deleteData) {
        try {
          await fetchWithAuth('/api/v1/sync/data', { method: 'DELETE' });
        } catch {
          // Best-effort purge — vault already local-only
        }
      }
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={18} strokeWidth={1.5} /></button>
        <span style={titleStyle}>Settings</span>
      </div>

      <div style={scrollStyle}>
        {/* Security */}
        <SectionHeader title="Security" />
        <SettingRow icon={<Timer size={18} strokeWidth={1.5} color={tokens.colors.secondary} />} label="Auto-lock timeout">
          <select value={autoLockMin} onChange={(e) => { const v = +e.target.value; setAutoLockMin(v); saveSetting('auto_lock_min', v); }} style={selectStyle}>
            <option value={1}>1 min</option>
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </SettingRow>
        <SettingRow icon={<Clipboard size={18} strokeWidth={1.5} color={tokens.colors.secondary} />} label="Clear clipboard after">
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
            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <Cloud size={18} strokeWidth={1.5} color={tokens.colors.secondary} />
                <div>
                  <div style={rowLabel}>Enable Cloud Sync</div>
                  <div style={rowHint}>{syncStatus}</div>
                </div>
              </div>
              <button type="button" onClick={handleSyncToggle} style={{ ...syncToggleTrack, backgroundColor: syncEnabled ? tokens.colors.primary : tokens.colors.border }}>
                <div style={{ ...syncToggleThumb, transform: syncEnabled ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
          </>
        )}

        {/* Data */}
        <SectionHeader title="Data" />
        <button onClick={onExport} style={linkRow}>
          <Download size={18} strokeWidth={1.5} color={tokens.colors.primary} /> Export Vault
        </button>
        <button onClick={onImport} style={linkRow}>
          <Upload size={18} strokeWidth={1.5} color={tokens.colors.primary} /> Import Passwords
        </button>

        {/* Account */}
        <SectionHeader title="Account" />
        {isOnline ? (
          <>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <User size={18} strokeWidth={1.5} color={tokens.colors.secondary} />
                <div style={rowLabel}>{email}</div>
              </div>
            </div>
            <button onClick={() => logout()} style={logoutBtn}>
              <LogOut size={16} strokeWidth={1.5} /> Log out
            </button>
          </>
        ) : (
          <>
            <UpgradeAccountForm />
            <button onClick={() => logout()} style={logoutBtn}>
              <LogOut size={16} strokeWidth={1.5} /> Reset vault
            </button>
          </>
        )}
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

function SettingRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
        {icon}
        <div style={rowLabel}>{label}</div>
      </div>
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
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: tokens.colors.text, padding: 4, display: 'flex', alignItems: 'center' };
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
const syncToggleTrack: React.CSSProperties = {
  width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
  position: 'relative', transition: 'background-color 0.2s', padding: 2,
  display: 'flex', alignItems: 'center',
};
const syncToggleThumb: React.CSSProperties = {
  width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
  transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};
const linkRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, width: '100%', textAlign: 'left',
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  background: 'none', border: 'none', borderBottom: `1px solid ${tokens.colors.border}`,
  fontSize: tokens.font.size.base, color: tokens.colors.primary, fontFamily: tokens.font.family, cursor: 'pointer',
};
const logoutBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, width: '100%', textAlign: 'left',
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  background: 'none', border: 'none',
  fontSize: tokens.font.size.base, color: tokens.colors.error, fontFamily: tokens.font.family, cursor: 'pointer',
};
