// Extension popup — root component with offline-aware routing + bottom nav
import React, { useEffect, useState } from 'react';
import { tokens } from '@vaultic/ui';
import { useAuthStore } from '../../stores/auth-store';
import { LoginForm } from '../../components/auth/login-form';
import { RegisterForm } from '../../components/auth/register-form';
import { LockScreen } from '../../components/auth/lock-screen';
import { VaultList } from '../../components/vault/vault-list';
import { VaultItemDetail } from '../../components/vault/vault-item-detail';
import { VaultItemForm } from '../../components/vault/vault-item-form';
import { PasswordGeneratorView } from '../../components/vault/password-generator-view';
import { SharePage } from '../../components/share/share-page';
import { BottomNav, type NavTab } from '../../components/common/bottom-nav';
import { useVaultStore } from '../../stores/vault-store';

type View =
  | { type: 'loading' }
  | { type: 'register' }
  | { type: 'login' }
  | { type: 'locked' }
  | { type: 'vault-list' }
  | { type: 'vault-detail'; id: string }
  | { type: 'vault-add' }
  | { type: 'vault-edit'; id: string }
  | { type: 'generator' }
  | { type: 'share' }
  | { type: 'settings' };

export function App() {
  const { isLocked, isLoggedIn, email, hydrate } = useAuthStore();
  const deleteItem = useVaultStore((s) => s.deleteItem);
  const [view, setView] = useState<View>({ type: 'loading' });
  const [activeTab, setActiveTab] = useState<NavTab>('vault');

  // Hydrate auth state on mount
  useEffect(() => {
    hydrate().then(() => {
      chrome.runtime?.sendMessage?.({ type: 'activity-ping' }).catch(() => {});
    });
  }, [hydrate]);

  // Route based on auth state
  useEffect(() => {
    if (view.type !== 'loading') return;
    if (!email && !isLoggedIn) setView({ type: 'register' });
    else if (email && isLocked) setView({ type: 'locked' });
    else if (email && !isLocked) setView({ type: 'vault-list' });
    else setView({ type: 'login' });
  }, [email, isLocked, isLoggedIn, view.type]);

  // React to auth state changes (after login/unlock/lock)
  useEffect(() => {
    if (view.type === 'loading') return;
    if (!email && !isLoggedIn) setView({ type: 'register' });
    else if (email && isLocked) setView({ type: 'locked' });
    else if (email && !isLocked && (view.type === 'locked' || view.type === 'login' || view.type === 'register')) {
      setView({ type: 'vault-list' });
    }
  }, [email, isLocked, isLoggedIn]);

  // Tab navigation
  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'vault') setView({ type: 'vault-list' });
    else if (tab === 'generator') setView({ type: 'generator' });
    else if (tab === 'share') setView({ type: 'share' });
    else if (tab === 'settings') setView({ type: 'settings' });
  };

  const showBottomNav = !['loading', 'register', 'login', 'locked'].includes(view.type);

  return (
    <div style={containerStyle}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view.type === 'loading' && <CenterMessage text="Loading..." />}
        {view.type === 'register' && <RegisterForm onSwitchToLogin={() => setView({ type: 'login' })} />}
        {view.type === 'login' && <LoginForm onSwitchToRegister={() => setView({ type: 'register' })} />}
        {view.type === 'locked' && <LockScreen />}

        {view.type === 'vault-list' && (
          <VaultList
            onItemClick={(id) => setView({ type: 'vault-detail', id })}
            onAddItem={() => setView({ type: 'vault-add' })}
          />
        )}
        {view.type === 'vault-detail' && (
          <VaultItemDetail
            itemId={view.id}
            onBack={() => setView({ type: 'vault-list' })}
            onEdit={() => setView({ type: 'vault-edit', id: view.id })}
            onDelete={async () => {
              await deleteItem(view.id);
              setView({ type: 'vault-list' });
            }}
          />
        )}
        {view.type === 'vault-add' && (
          <VaultItemForm
            onBack={() => setView({ type: 'vault-list' })}
            onSaved={() => setView({ type: 'vault-list' })}
          />
        )}
        {view.type === 'vault-edit' && (
          <VaultItemForm
            editId={view.id}
            onBack={() => setView({ type: 'vault-detail', id: view.id })}
            onSaved={() => setView({ type: 'vault-detail', id: view.id })}
          />
        )}
        {view.type === 'generator' && <PasswordGeneratorView />}
        {view.type === 'share' && <SharePage />}
        {view.type === 'settings' && <CenterMessage text="Settings — Phase 8" />}
      </div>

      {showBottomNav && <BottomNav active={activeTab} onChange={handleTabChange} />}
    </div>
  );
}

function CenterMessage({ text }: { text: string }) {
  return (
    <div style={centerStyle}>
      <span style={{ color: tokens.colors.secondary, fontFamily: tokens.font.family, fontSize: tokens.font.size.base }}>
        {text}
      </span>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: tokens.extension.width,
  height: tokens.extension.height,
  fontFamily: tokens.font.family,
  backgroundColor: tokens.colors.background,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};
