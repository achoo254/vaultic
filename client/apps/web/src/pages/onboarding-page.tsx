// Onboarding page — offline vault setup with master password only (no account needed)
import React, { useState } from 'react';
import { Button, Input, tokens, useTheme } from '@vaultic/ui';
import { IconShieldLock } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/auth-store';

export function OnboardingPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setupOfflineVault = useAuthStore((s) => s.setupOfflineVault);

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
      navigate('/vault');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    padding: tokens.spacing.xxl, gap: tokens.spacing.xl,
    minHeight: '100vh', justifyContent: 'center',
  };

  return (
    <form onSubmit={handleSubmit} style={containerStyle}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacing.md }}>
        <IconShieldLock size={48} stroke={1.5} color={colors.primary} />
        <div style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          Offline Vault
        </div>
        <p style={{ fontSize: tokens.font.size.sm, color: colors.secondary, fontFamily: tokens.font.family, lineHeight: 1.5, maxWidth: 320 }}>
          Your data stays on this device only. No account needed. You can upgrade to cloud sync later.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
        <Input label="Master Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" required />
        <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" error={error || undefined} required />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md, alignItems: 'center' }}>
        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
          Create Offline Vault
        </Button>
        <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family }}>
          Sign in with account instead
        </button>
      </div>
    </form>
  );
}
