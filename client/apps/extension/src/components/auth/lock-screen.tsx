// Screen 03: Lock Screen — re-enter master password to unlock vault (offline + online)
import React, { useState } from 'react';
import { Button, Input, Modal, tokens, useTheme } from '@vaultic/ui';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';

export function LockScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation(['auth', 'common']);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const email = useAuthStore((s) => s.email);
  const mode = useAuthStore((s) => s.mode);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:lock.error.failed'));
    } finally {
      setLoading(false);
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacing.xxl,
    gap: tokens.spacing.xl,
    height: '100%',
    justifyContent: 'center',
  };

  const topSection: React.CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing.md,
  };

  const lockIcon: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const emailStyle: React.CSSProperties = {
    fontSize: tokens.font.size.base,
    color: colors.secondary,
    fontFamily: tokens.font.family,
  };

  const fieldSection: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
  };

  const actionsSection: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    alignItems: 'center',
  };

  const logoutLink: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.secondary,
    cursor: 'pointer',
    fontSize: tokens.font.size.sm,
    fontFamily: tokens.font.family,
  };

  const eyeToggleStyle: React.CSSProperties = {
    position: 'absolute',
    right: 12,
    top: 30,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: 4,
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={topSection}>
        <div style={lockIcon}>
          <Lock size={48} strokeWidth={1.5} color={colors.primary} />
        </div>
        <div style={emailStyle}>
          {mode === 'online' && email ? email : t('auth:lock.offlineVault')}
        </div>
      </div>

      <div style={fieldSection}>
        <div style={{ position: 'relative' }}>
          <Input
            label={t('common:masterPassword')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth:login.placeholder.password')}
            error={error || undefined}
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={eyeToggleStyle}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <div style={actionsSection}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          style={{ width: '100%' }}
        >
          {t('auth:lock.unlock')}
        </Button>

        <button
          type="button"
          onClick={() => mode === 'online' ? logout() : setShowResetConfirm(true)}
          style={logoutLink}
        >
          {mode === 'online' ? t('auth:lock.logout') : t('auth:lock.resetVault')}
        </button>
      </div>

      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title={t('auth:lock.resetTitle')}>
        <p style={{ fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family, marginBottom: tokens.spacing.lg, lineHeight: 1.5 }}>
          {t('auth:lock.resetMessage')}
        </p>
        <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
          <Button variant="secondary" size="md" onClick={() => setShowResetConfirm(false)} style={{ flex: 1 }}>
            {t('common:cancel')}
          </Button>
          <Button variant="primary" size="md" onClick={() => logout()} style={{ flex: 1, backgroundColor: colors.error }}>
            {t('common:reset')}
          </Button>
        </div>
      </Modal>
    </form>
  );
}
