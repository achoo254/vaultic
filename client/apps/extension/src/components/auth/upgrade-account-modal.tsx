// Screen 19c: Upgrade Account modal — upgrade offline vault to online account
// Shows when user with existing offline vault tries to register
import React, { useState } from 'react';
import { Button, Input, Modal, tokens, useTheme } from '@vaultic/ui';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface UpgradeAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeAccountModal({ open, onClose }: UpgradeAccountModalProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const upgradeToOnline = useAuthStore((s) => s.upgradeToOnline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorField(null);
    if (!email.trim()) { setError('Email is required'); setErrorField('email'); return; }
    if (!password) { setError('Password is required'); setErrorField('password'); return; }

    setLoading(true);
    try {
      await upgradeToOnline(email, password, API_BASE_URL);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upgrade failed';
      setError(msg);
      // Route error to correct input based on message content
      setErrorField(msg.toLowerCase().includes('email') ? 'email' : 'password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Icon — design: user-plus in #EFF6FF circle */}
        <div style={{
          width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserPlus size={24} strokeWidth={1.5} color={colors.primary} />
        </div>

        <div style={{ fontSize: 16, fontWeight: tokens.font.weight.bold, color: colors.text, fontFamily: tokens.font.family }}>
          Create Account
        </div>

        <div style={{ fontSize: 13, color: colors.secondary, fontFamily: tokens.font.family, lineHeight: 1.5 }}>
          Link your vault to an account to enable cloud sync and server-based sharing.
        </div>

        {/* Email field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: tokens.font.weight.semibold, color: '#A1A1AA', letterSpacing: 1, fontFamily: tokens.font.family }}>
            EMAIL
          </span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={errorField === 'email' ? error : undefined}
            required
          />
        </div>

        {/* Password field — re-enter current master password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: tokens.font.weight.semibold, color: '#A1A1AA', letterSpacing: 1, fontFamily: tokens.font.family }}>
            MASTER PASSWORD
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Re-enter your master password"
            error={errorField === 'password' ? error : undefined}
            required
          />
        </div>

        {/* Vault preserved badge — design: green bg, shield-check icon */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          backgroundColor: '#F0FDF4', borderRadius: 8,
        }}>
          <ShieldCheck size={16} strokeWidth={1.5} color="#16A34A" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: tokens.font.weight.medium, color: '#16A34A', fontFamily: tokens.font.family }}>
            Your vault data will be preserved
          </span>
        </div>

        {/* Buttons — Create Account + Cancel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button type="submit" variant="primary" size="md" loading={loading} style={{ width: '100%', height: 40 }}>
            Create Account
          </Button>
          <button type="button" onClick={onClose} style={{
            width: '100%', height: 40, borderRadius: 8, border: `1px solid ${colors.border}`,
            background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tokens.font.weight.medium,
            color: colors.text, fontFamily: tokens.font.family,
          }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
