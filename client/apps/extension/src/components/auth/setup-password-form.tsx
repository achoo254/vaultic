// First-run screen: set master password to create offline vault (no account needed)
import React, { useState } from 'react';
import { Button, Input } from '@vaultic/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import {
  formStyle, logoSection, logoText, headingStyle, fieldsSection,
  actionsSection, linkStyle, eyeToggleStyle, strengthBarContainer, strengthBar,
} from './register-form.styles';
import { tokens } from '@vaultic/ui';

interface SetupPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function SetupPasswordForm({ onSwitchToLogin }: SetupPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setupOfflineVault = useAuthStore((s) => s.setupOfflineVault);

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await setupOfflineVault(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={logoSection}>
        <div style={logoText}>Vaultic</div>
        <div style={headingStyle}>Set Master Password</div>
      </div>

      <div style={warningStyle}>
        There is no password recovery. If you forget your master password, your vault data will be permanently lost.
      </div>

      <div style={fieldsSection}>
        <div>
          <div style={{ position: 'relative' }}>
            <Input
              label="Master Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a strong password"
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
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm master password"
          error={error || undefined}
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
          Create Vault
        </Button>

        <button type="button" onClick={onSwitchToLogin} style={linkStyle}>
          Have an account? Log in
        </button>
      </div>
    </form>
  );
}

function getPasswordStrength(pw: string) {
  if (pw.length === 0) return { percent: 0, color: tokens.colors.border };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const colors = [tokens.colors.error, tokens.colors.error, tokens.colors.warning, tokens.colors.warning, tokens.colors.success, tokens.colors.success];
  return { percent: Math.min(100, score * 20), color: colors[score] };
}

const warningStyle: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: tokens.font.size.xs,
  color: '#92400e',
  fontFamily: tokens.font.family,
  lineHeight: 1.4,
};
