// Screen 01: Register — email + master password + confirm → create account
import React, { useState } from 'react';
import { Button, Input, tokens, useTheme } from '@vaultic/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { getStyles } from './register-form.styles';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { colors } = useTheme();
  const {
    formStyle, logoSection, logoText, headingStyle, fieldsSection,
    actionsSection, linkStyle, eyeToggleStyle, strengthBarContainer, strengthBar,
  } = getStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const register = useAuthStore((s) => s.register);

  const passwordStrength = getPasswordStrength(password, colors);

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
          Create Account
        </Button>

        <button type="button" onClick={onSwitchToLogin} style={linkStyle}>
          Already have an account? Log in
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
