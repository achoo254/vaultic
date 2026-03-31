// Settings page — theme, sync toggle, export/import, logout
import React, { useState } from 'react';
import { Button, Card, tokens, useTheme, Select } from '@vaultic/ui';
import type { ThemeMode } from '@vaultic/ui';
import { IconArrowLeft, IconCloud, IconCloudOff, IconDownload, IconUpload } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/auth-store';
import { useVaultStore } from '../stores/vault-store';

export function SettingsPage() {
  const { colors, mode: themeMode, setMode: setThemeMode } = useTheme();
  const navigate = useNavigate();
  const { email, mode, logout } = useAuthStore();
  const { syncNow } = useVaultStore();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } catch {
      // Sync errors handled silently
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
    padding: `${tokens.spacing.lg}px 0`,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.semibold,
    color: colors.secondary, fontFamily: tokens.font.family,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm, marginTop: tokens.spacing.lg,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: `${tokens.spacing.md}px 0`,
  };

  return (
    <div>
      <div style={headerStyle}>
        <button onClick={() => navigate('/vault')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <IconArrowLeft size={20} stroke={1.5} color={colors.text} />
        </button>
        <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: colors.text, fontFamily: tokens.font.family }}>
          Settings
        </div>
      </div>

      {/* Account */}
      <div style={sectionTitle}>Account</div>
      <Card style={{ padding: tokens.spacing.md }}>
        <div style={rowStyle}>
          <span style={{ color: colors.text, fontFamily: tokens.font.family, fontSize: tokens.font.size.base }}>
            {email || 'Offline vault'}
          </span>
          <span style={{ color: colors.secondary, fontFamily: tokens.font.family, fontSize: tokens.font.size.sm }}>
            {mode}
          </span>
        </div>
      </Card>

      {/* Appearance */}
      <div style={sectionTitle}>Appearance</div>
      <Card style={{ padding: tokens.spacing.md }}>
        <div style={rowStyle}>
          <span style={{ color: colors.text, fontFamily: tokens.font.family, fontSize: tokens.font.size.base }}>Theme</span>
          <Select
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            style={{ width: 120 }}
          />
        </div>
      </Card>

      {/* Cloud Sync */}
      {mode === 'online' && (
        <>
          <div style={sectionTitle}>Cloud Sync</div>
          <Card style={{ padding: tokens.spacing.md }}>
            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <IconCloud size={20} stroke={1.5} color={colors.primary} />
                <span style={{ color: colors.text, fontFamily: tokens.font.family, fontSize: tokens.font.size.base }}>Sync Now</span>
              </div>
              <Button variant="secondary" size="sm" loading={syncing} onClick={handleSync}>
                Sync
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Actions */}
      <div style={{ marginTop: tokens.spacing.xxl, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
        <Button variant="secondary" size="md" onClick={handleLogout} style={{ width: '100%', color: colors.error }}>
          {mode === 'online' ? 'Logout' : 'Reset Vault'}
        </Button>
      </div>
    </div>
  );
}
