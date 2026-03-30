// Screen 19c: Upgrade Account modal — upgrade offline vault to online account
// Shows when user with existing offline vault tries to register
import React, { useState } from 'react';
import { Button, Input, Modal, tokens, useTheme } from '@vaultic/ui';
import { IconUserPlus, IconShieldCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface UpgradeAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeAccountModal({ open, onClose }: UpgradeAccountModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const upgradeToOnline = useAuthStore((s) => s.upgradeToOnline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorField(null);
    if (!email.trim()) { setError(t('auth:upgrade.error.emailRequired')); setErrorField('email'); return; }
    if (!password) { setError(t('auth:upgrade.error.passwordRequired')); setErrorField('password'); return; }

    setLoading(true);
    try {
      await upgradeToOnline(email, password, API_BASE_URL);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth:upgrade.error.failed');
      setError(msg);
      // Route error to correct input based on message content
      setErrorField(msg.toLowerCase().includes('email') ? 'email' : 'password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Icon — design: user-plus in primaryBg circle */}
        <div style={{
          width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconUserPlus size={24} stroke={1.5} color={colors.primary} />
        </div>

        <div style={{ fontSize: 16, fontWeight: tokens.font.weight.bold, color: colors.text, fontFamily: tokens.font.family }}>
          {t('auth:upgrade.title')}
        </div>

        <div style={{ fontSize: 13, color: colors.secondary, fontFamily: tokens.font.family, lineHeight: 1.5 }}>
          {t('auth:upgrade.description')}
        </div>

        {/* Email field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: tokens.font.weight.semibold, color: colors.secondary, letterSpacing: 1, fontFamily: tokens.font.family }}>
            {t('auth:upgrade.emailLabel')}
          </span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth:upgrade.placeholder.email')}
            error={errorField === 'email' ? error : undefined}
            required
          />
        </div>

        {/* Password field — re-enter current master password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: tokens.font.weight.semibold, color: colors.secondary, letterSpacing: 1, fontFamily: tokens.font.family }}>
            {t('auth:upgrade.passwordLabel')}
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth:upgrade.placeholder.password')}
            error={errorField === 'password' ? error : undefined}
            required
          />
        </div>

        {/* Vault preserved badge — design: green bg, shield-check icon */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          backgroundColor: colors.successBg, borderRadius: 8,
        }}>
          <IconShieldCheck size={16} stroke={1.5} color={colors.successText} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: tokens.font.weight.medium, color: colors.successText, fontFamily: tokens.font.family }}>
            {t('auth:upgrade.vaultPreserved')}
          </span>
        </div>

        {/* Buttons — Create Account + Cancel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button type="submit" variant="primary" size="md" loading={loading} style={{ width: '100%', height: 40 }}>
            {t('auth:upgrade.title')}
          </Button>
          <button type="button" onClick={onClose} style={{
            width: '100%', height: 40, borderRadius: 8, border: `1px solid ${colors.border}`,
            background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tokens.font.weight.medium,
            color: colors.text, fontFamily: tokens.font.family,
          }}>
            {t('common:cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
