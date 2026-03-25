// Screen 01: Register — email + master password + confirm → create account
import React, { useState } from 'react';
import { Button, Input } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const register = useAuthStore((s) => s.register);

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
      await register(email, password, API_BASE_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={logoSection}>
        <div style={logoText}>Vaultic</div>
        <div style={headingStyle}>Create Account</div>
      </div>

      <div style={fieldsSection}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <div>
          <div style={{ position: 'relative' }}>
            <Input
              label="Master Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a strong password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeToggleStyle}
              tabIndex={-1}
            >
              {showPassword ? '🔒' : '👁'}
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
          Create Account
        </Button>

        <button type="button" onClick={onSwitchToLogin} style={linkStyle}>
          Already have an account? Log in
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

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: tokens.spacing.xxl,
  gap: tokens.spacing.lg,
  height: '100%',
};

const logoSection: React.CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.sm,
  paddingTop: tokens.spacing.md,
};

const logoText: React.CSSProperties = {
  fontSize: tokens.font.size.xxl,
  fontWeight: tokens.font.weight.bold,
  color: tokens.colors.primary,
  fontFamily: tokens.font.family,
};

const headingStyle: React.CSSProperties = {
  fontSize: tokens.font.size.xl,
  fontWeight: tokens.font.weight.semibold,
  color: tokens.colors.text,
  fontFamily: tokens.font.family,
};

const fieldsSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
  flex: 1,
};

const actionsSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
  alignItems: 'center',
};

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: tokens.colors.primary,
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

const strengthBarContainer: React.CSSProperties = {
  height: 4,
  backgroundColor: tokens.colors.border,
  borderRadius: tokens.radius.full,
  marginTop: tokens.spacing.xs,
  overflow: 'hidden',
};

const strengthBar: React.CSSProperties = {
  height: '100%',
  borderRadius: tokens.radius.full,
  transition: 'width 0.2s, background-color 0.2s',
};
