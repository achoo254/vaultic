// Screen 03: Lock Screen — re-enter master password to unlock vault (offline)
import React, { useState } from 'react';
import { Button, Input } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';

export function LockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const email = useAuthStore((s) => s.email);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={topSection}>
        <div style={lockIcon}>🔒</div>
        <div style={emailStyle}>{email}</div>
      </div>

      <div style={fieldSection}>
        <div style={{ position: 'relative' }}>
          <Input
            label="Master Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter master password"
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

        <button type="button" onClick={() => logout()} style={logoutLink}>
          Log out
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
  fontSize: 48,
};

const emailStyle: React.CSSProperties = {
  fontSize: tokens.font.size.base,
  color: tokens.colors.secondary,
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
  color: tokens.colors.secondary,
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
