// Screen 02: Login — email + master password → derive keys → call API
import React, { useState } from 'react';
import { Button, Input } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, API_BASE_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={logoSection}>
        <div style={logoText}>Vaultic</div>
        <div style={headingStyle}>Welcome Back</div>
      </div>

      <div style={fieldsSection}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={error && !password ? error : undefined}
          required
        />

        <div style={{ position: 'relative' }}>
          <Input
            label="Master Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter master password"
            error={error || undefined}
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
      </div>

      <div style={actionsSection}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          style={{ width: '100%' }}
        >
          Unlock
        </Button>

        <button type="button" onClick={onSwitchToRegister} style={linkStyle}>
          Create account
        </button>
      </div>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: tokens.spacing.xxl,
  gap: tokens.spacing.xl,
  height: '100%',
};

const logoSection: React.CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.sm,
  paddingTop: tokens.spacing.xl,
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
  gap: tokens.spacing.lg,
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
