// Upgrade offline vault to online account — enter email + re-enter password
import React, { useState } from 'react';
import { Button, Input } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function UpgradeAccountForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const upgradeToOnline = useAuthStore((s) => s.upgradeToOnline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    try {
      await upgradeToOnline(email, password, API_BASE_URL);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={sectionStyle}>
        <div style={successStyle}>
          Account created! You can now enable Cloud Sync.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={sectionStyle}>
      <div style={descStyle}>
        Create an account to enable Cloud Sync and server-backed shares.
        Your vault data stays local — nothing changes until you enable sync.
      </div>
      <div style={fieldsStyle}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Master Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Re-enter your master password"
          error={error || undefined}
          required
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={loading}
        style={{ width: '100%' }}
      >
        Create Account
      </Button>
    </form>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px ${tokens.spacing.md}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
};

const descStyle: React.CSSProperties = {
  fontSize: tokens.font.size.xs,
  color: tokens.colors.secondary,
  fontFamily: tokens.font.family,
  lineHeight: 1.4,
};

const fieldsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.sm,
};

const successStyle: React.CSSProperties = {
  fontSize: tokens.font.size.sm,
  color: tokens.colors.success,
  fontFamily: tokens.font.family,
  textAlign: 'center',
  padding: tokens.spacing.md,
};
