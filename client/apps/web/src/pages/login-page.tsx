// Login page — email + master password -> derive keys -> call web auth API
import React, { useState } from 'react';
import { Button, Input, tokens, useTheme } from '@vaultic/ui';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/auth-store';

export function LoginPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate('/vault');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    padding: tokens.spacing.xxl, gap: tokens.spacing.xl,
    minHeight: '100vh', justifyContent: 'center',
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
        <div style={{ fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold, color: colors.primary, fontFamily: tokens.font.family }}>
          Vaultic
        </div>
        <div style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          Sign In
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <div style={{ position: 'relative' }}>
          <Input
            label="Master Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your master password"
            error={error || undefined}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 12, top: 30, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            tabIndex={-1}
          >
            {showPassword ? <IconEyeOff size={16} stroke={1.5} /> : <IconEye size={16} stroke={1.5} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md, alignItems: 'center' }}>
        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
          Sign In
        </Button>
        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family }}
        >
          Create an account
        </button>
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          style={{ background: 'none', border: 'none', color: colors.secondary, cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family }}
        >
          Use without account
        </button>
      </div>
    </form>
  );
}
