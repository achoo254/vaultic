// First-run screen: set master password to create offline vault (no account needed)
import React, { useState } from 'react';
import { Button, Input, tokens, useTheme } from '@vaultic/ui';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';
import { getStyles } from './register-form.styles';

interface SetupPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function SetupPasswordForm({ onSwitchToLogin }: SetupPasswordFormProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['auth', 'common']);
  const {
    formStyle, logoSection, logoText, headingStyle, fieldsSection,
    actionsSection, linkStyle, eyeToggleStyle, strengthBarContainer, strengthBar,
  } = getStyles(colors);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'password' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setupOfflineVault = useAuthStore((s) => s.setupOfflineVault);

  const passwordStrength = getPasswordStrength(password, colors);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorField(null);

    if (password !== confirmPassword) {
      setError(t('auth:register.error.passwordMismatch'));
      setErrorField('confirm');
      return;
    }
    if (password.length < 8) {
      setError(t('auth:register.error.passwordLength'));
      setErrorField('password');
      return;
    }

    setLoading(true);
    try {
      await setupOfflineVault(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:setup.error.failed'));
      setErrorField('password');
    } finally {
      setLoading(false);
    }
  };

  const warningStyle: React.CSSProperties = {
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: tokens.font.size.xs,
    color: colors.warningText,
    fontFamily: tokens.font.family,
    lineHeight: 1.4,
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={logoSection}>
        <div style={logoText}>Vaultic</div>
        <div style={headingStyle}>{t('auth:setup.title')}</div>
      </div>

      <div style={warningStyle}>
        {t('auth:setup.warning')}
      </div>

      <div style={fieldsSection}>
        <div>
          <div style={{ position: 'relative' }}>
            <Input
              label={t('common:masterPassword')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth:register.placeholder.password')}
              error={errorField === 'password' ? error : undefined}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeToggleStyle}
              tabIndex={-1}
            >
              {showPassword ? <IconEyeOff size={16} stroke={1.5} /> : <IconEye size={16} stroke={1.5} />}
            </button>
          </div>
          {password && (
            <div style={strengthBarContainer}>
              <div
                style={{
                  ...strengthBar,
                  width: `${passwordStrength.percent}%`,
                  backgroundColor: passwordStrength.color,
                }}
              />
            </div>
          )}
        </div>

        <Input
          label={t('common:confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('auth:register.placeholder.confirm')}
          error={errorField === 'confirm' ? error : undefined}
          required
        />
      </div>

      <div style={actionsSection}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          style={{ width: '100%' }}
        >
          {t('auth:setup.createVault')}
        </Button>

        <button type="button" onClick={onSwitchToLogin} style={linkStyle}>
          {t('auth:setup.haveAccount')}
        </button>
      </div>
    </form>
  );
}

function getPasswordStrength(pw: string, colors: ReturnType<typeof useTheme>['colors']) {
  if (pw.length === 0) return { percent: 0, color: colors.border };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const colorList = [colors.error, colors.error, colors.warning, colors.warning, colors.success, colors.success];
  return { percent: Math.min(100, score * 20), color: colorList[score] };
}
