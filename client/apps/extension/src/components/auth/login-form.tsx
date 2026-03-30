// Screen 02: Login — email + master password → derive keys → call API
import React, { useState } from 'react';
import { Button, Input, tokens, useTheme } from '@vaultic/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToSetup?: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToSetup }: LoginFormProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'email' | 'password' | 'both' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorField(null);
    setLoading(true);
    try {
      await login(email, password, API_BASE_URL);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth:login.error.failed');
      setError(msg);
      const lower = msg.toLowerCase();
      if (lower.includes('connect') || lower.includes('server')) {
        setErrorField(null);
      } else if (lower.includes('email') || lower.includes('not found') || lower.includes('user')) {
        setErrorField('email');
      } else if (lower.includes('invalid credentials') || lower.includes('credentials')) {
        setErrorField('both');
      } else {
        setErrorField('password');
      }
    } finally {
      setLoading(false);
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    padding: tokens.spacing.xxl, gap: tokens.spacing.xl, height: '100%',
  };
  const logoSection: React.CSSProperties = {
    textAlign: 'center', display: 'flex', flexDirection: 'column',
    gap: tokens.spacing.sm, paddingTop: tokens.spacing.xl,
  };
  const logoText: React.CSSProperties = {
    fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold,
    color: colors.primary, fontFamily: tokens.font.family,
  };
  const headingStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.semibold,
    color: colors.text, fontFamily: tokens.font.family,
  };
  const fieldsSection: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg, flex: 1,
  };
  const actionsSection: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: tokens.spacing.md, alignItems: 'center',
  };
  const linkStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: colors.primary,
    cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family,
  };
  const eyeToggleStyle: React.CSSProperties = {
    position: 'absolute', right: 12, top: 30,
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4,
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={logoSection}>
        <div style={logoText}>Vaultic</div>
        <div style={headingStyle}>{t('auth:login.title')}</div>
      </div>

      <div style={fieldsSection}>
        <Input
          label={t('common:email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth:login.placeholder.email')}
          error={errorField === 'email' || errorField === 'both' ? error : undefined}
          required
        />

        <div style={{ position: 'relative' }}>
          <Input
            label={t('common:masterPassword')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth:login.placeholder.password')}
            error={errorField === 'password' || errorField === 'both' ? error : undefined}
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeToggleStyle} tabIndex={-1}>
            {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <div style={actionsSection}>
        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
          {t('auth:login.unlock')}
        </Button>
        <button type="button" onClick={onSwitchToRegister} style={linkStyle}>
          {t('auth:login.createAccount')}
        </button>
        {onSwitchToSetup && (
          <button type="button" onClick={onSwitchToSetup} style={linkStyle}>
            {t('auth:login.useWithoutAccount')}
          </button>
        )}
      </div>
    </form>
  );
}
