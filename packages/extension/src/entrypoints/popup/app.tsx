// Extension popup — root component with offline-aware routing
//
// Routing logic:
//   No local account? → RegisterForm (requires network)
//   Has account but locked? → LockScreen (offline OK)
//   Unlocked? → VaultPlaceholder (offline OK, sync if online)
//   First login on this device? → LoginForm (requires network once)

import React, { useEffect, useState } from 'react';
import { tokens } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';
import { LoginForm } from '../../components/auth/login-form';
import { RegisterForm } from '../../components/auth/register-form';
import { LockScreen } from '../../components/auth/lock-screen';

type AuthView = 'loading' | 'register' | 'login' | 'locked' | 'vault';

export function App() {
  const { isLocked, isLoggedIn, email, hydrate } = useAuthStore();
  const [view, setView] = useState<AuthView>('loading');

  useEffect(() => {
    hydrate().then(() => {
      // Ping background to track activity
      chrome.runtime?.sendMessage?.({ type: 'activity-ping' }).catch(() => {});
    });
  }, [hydrate]);

  // Determine view based on auth state
  useEffect(() => {
    if (view === 'loading' && email !== undefined) {
      if (!email && !isLoggedIn) {
        setView('register');
      } else if (email && isLocked) {
        setView('locked');
      } else if (email && !isLocked) {
        setView('vault');
      } else {
        setView('login');
      }
    }
  }, [email, isLocked, isLoggedIn, view]);

  // Update view when auth state changes (after login/register/unlock)
  useEffect(() => {
    if (view === 'loading') return;
    if (!email && !isLoggedIn) {
      setView('register');
    } else if (email && isLocked) {
      setView('locked');
    } else if (email && !isLocked) {
      setView('vault');
    }
  }, [email, isLocked, isLoggedIn]);

  return (
    <div style={containerStyle}>
      {view === 'loading' && <LoadingView />}
      {view === 'register' && (
        <RegisterForm onSwitchToLogin={() => setView('login')} />
      )}
      {view === 'login' && (
        <LoginForm onSwitchToRegister={() => setView('register')} />
      )}
      {view === 'locked' && <LockScreen />}
      {view === 'vault' && <VaultPlaceholder />}
    </div>
  );
}

function LoadingView() {
  return (
    <div style={centeredStyle}>
      <div style={{ fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold, color: tokens.colors.primary, fontFamily: tokens.font.family }}>
        Vaultic
      </div>
    </div>
  );
}

/** Placeholder until Phase 5 vault UI is implemented. */
function VaultPlaceholder() {
  const { email, lock, logout } = useAuthStore();
  return (
    <div style={{ ...centeredStyle, gap: tokens.spacing.lg }}>
      <div style={{ fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold, color: tokens.colors.primary, fontFamily: tokens.font.family }}>
        Vaultic
      </div>
      <div style={{ fontSize: tokens.font.size.base, color: tokens.colors.secondary, fontFamily: tokens.font.family }}>
        Logged in as {email}
      </div>
      <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.secondary, fontFamily: tokens.font.family }}>
        Vault UI coming in Phase 5
      </div>
      <div style={{ display: 'flex', gap: tokens.spacing.md }}>
        <button onClick={() => lock()} style={actionBtn}>Lock</button>
        <button onClick={() => logout()} style={actionBtn}>Logout</button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: tokens.extension.width,
  height: tokens.extension.height,
  fontFamily: tokens.font.family,
  backgroundColor: tokens.colors.background,
  overflow: 'hidden',
};

const centeredStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: tokens.spacing.md,
};

const actionBtn: React.CSSProperties = {
  background: 'none',
  border: `1px solid ${tokens.colors.border}`,
  borderRadius: tokens.radius.md,
  padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
  cursor: 'pointer',
  fontFamily: tokens.font.family,
  fontSize: tokens.font.size.sm,
  color: tokens.colors.text,
};
