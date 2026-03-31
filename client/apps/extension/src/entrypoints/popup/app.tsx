// Extension popup — root component with offline-aware routing + bottom nav
import React, { useEffect, useState } from 'react';
import { tokens, ThemeProvider, useTheme, I18nProvider } from '@vaultic/ui';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/i18n-config';
import '../../i18n/i18n-types';
import { pushPreferencesToServer } from '../../lib/sync-preferences';
import { useAuthStore } from '../../stores/auth-store';
import { ConsentScreen } from '../../components/onboarding/consent-screen';
import { SetupPasswordForm } from '../../components/auth/setup-password-form';
import { LoginForm } from '../../components/auth/login-form';
import { RegisterForm } from '../../components/auth/register-form';
import { LockScreen } from '../../components/auth/lock-screen';
import { VaultList } from '../../components/vault/vault-list';
import { VaultItemDetail } from '../../components/vault/vault-item-detail';
import { VaultItemForm } from '../../components/vault/vault-item-form';
import { PasswordGeneratorView } from '../../components/vault/password-generator-view';
import { SharePage } from '../../components/share/share-page';
import { SettingsPage } from '../../components/settings/settings-page';
import { ExportVault } from '../../components/settings/export-vault';
import { ImportPasswords } from '../../components/settings/import-passwords';
import { SecurityHealth } from '../../components/settings/security-health';
import { FolderManagement } from '../../components/vault/folder-management';
import { ToastContainer } from '../../components/common/toast';
import { BottomNav, type NavTab } from '../../components/common/bottom-nav';
import { UpdateBanner } from '../../components/common/update-banner';
import { useVaultStore } from '../../stores/vault-store';
import type { UpdateState } from '../../lib/update-checker';
import { UPDATE_STORAGE_KEY, resolveDownloadUrl } from '../../lib/update-checker';

type View =
  | { type: 'loading' }
  | { type: 'setup' }
  | { type: 'register' }
  | { type: 'login' }
  | { type: 'locked' }
  | { type: 'vault-list' }
  | { type: 'vault-detail'; id: string }
  | { type: 'vault-add' }
  | { type: 'vault-edit'; id: string }
  | { type: 'generator' }
  | { type: 'share' }
  | { type: 'settings' }
  | { type: 'export' }
  | { type: 'import' }
  | { type: 'health' }
  | { type: 'folders' };

const CONSENT_KEY = 'vaultic_consent_accepted';

export function App() {
  const { vaultState, hydrate } = useAuthStore();
  const deleteItem = useVaultStore((s) => s.deleteItem);
  const [view, setView] = useState<View>({ type: 'loading' });
  const [activeTab, setActiveTab] = useState<NavTab>('vault' as NavTab);
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(null);

  // Check consent status on mount
  useEffect(() => {
    chrome.storage.local.get(CONSENT_KEY, (result) => {
      if (chrome.runtime.lastError) {
        setConsentAccepted(false);
        return;
      }
      setConsentAccepted(result[CONSENT_KEY] === true);
    });
  }, []);

  const handleConsentAccept = () => {
    chrome.storage.local.set({ [CONSENT_KEY]: true }, () => {
      if (chrome.runtime.lastError) return;
      setConsentAccepted(true);
    });
  };

  // Hydrate auth state + record activity for auto-lock timer
  useEffect(() => {
    if (consentAccepted !== true) return;
    hydrate();
    chrome.runtime?.sendMessage?.({ type: 'record-activity' }).catch(() => {});
  }, [hydrate, consentAccepted]);

  // Route based on vaultState (replaces old isLoggedIn + isLocked logic)
  useEffect(() => {
    if (view.type !== 'loading') return;
    if (vaultState === 'no_vault') setView({ type: 'setup' });
    else if (vaultState === 'locked') setView({ type: 'locked' });
    else if (vaultState === 'unlocked') setView({ type: 'vault-list' });
  }, [vaultState, view.type]);

  // React to auth state changes (after setup/login/unlock/lock)
  useEffect(() => {
    if (view.type === 'loading') return;
    if (vaultState === 'no_vault' && !['setup', 'login', 'register'].includes(view.type)) {
      setView({ type: 'setup' });
    } else if (vaultState === 'locked' && !['locked'].includes(view.type)) {
      setView({ type: 'locked' });
    } else if (vaultState === 'unlocked' && ['locked', 'login', 'register', 'setup'].includes(view.type)) {
      setView({ type: 'vault-list' });
    }
  }, [vaultState]);

  // Tab navigation
  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'vault') setView({ type: 'vault-list' });
    else if (tab === 'generator') setView({ type: 'generator' });
    else if (tab === 'share') setView({ type: 'share' });
    else if (tab === 'health') setView({ type: 'health' });
  };

  const showBottomNav = !['loading', 'setup', 'register', 'login', 'locked'].includes(view.type);

  // Show nothing while checking consent status
  if (consentAccepted === null) return null;

  return (
    <ThemeProvider>
      <I18nProvider onLanguageChange={(lang) => { i18n.changeLanguage(lang); pushPreferencesToServer({ language: lang }); }}>
        {!consentAccepted ? (
          <ConsentScreen onAccept={handleConsentAccept} />
        ) : (
          <AppShell view={view} setView={setView} activeTab={activeTab} setActiveTab={setActiveTab}
            showBottomNav={showBottomNav} handleTabChange={handleTabChange} deleteItem={deleteItem} />
        )}
      </I18nProvider>
    </ThemeProvider>
  );
}

function AppShell({ view, setView, activeTab, setActiveTab, showBottomNav, handleTabChange, deleteItem }: {
  view: View; setView: (v: View) => void; activeTab: NavTab; setActiveTab: (t: NavTab) => void;
  showBottomNav: boolean; handleTabChange: (t: NavTab) => void; deleteItem: (id: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation(['common']);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  // Load update state on mount + listen for storage changes
  useEffect(() => {
    chrome.storage.local.get(UPDATE_STORAGE_KEY, (result) => {
      if (result[UPDATE_STORAGE_KEY]) setUpdateState(result[UPDATE_STORAGE_KEY]);
    });
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (UPDATE_STORAGE_KEY in changes) {
        setUpdateState(changes[UPDATE_STORAGE_KEY].newValue || null);
      }
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  const handleUpdate = () => {
    if (!updateState?.info) return;
    const url = resolveDownloadUrl(updateState.info.downloadUrl);
    if (url) {
      chrome.downloads.download({ url }, () => {
        if (chrome.runtime.lastError) console.error('Download failed:', chrome.runtime.lastError);
      });
    }
    chrome.tabs.create({ url: chrome.runtime.getURL('/update-guide.html') });
    window.close();
  };

  const handleDismissUpdate = () => {
    if (!updateState?.info) return;
    chrome.runtime.sendMessage({ type: 'DISMISS_UPDATE', version: updateState.info.version });
  };

  const showBanner = updateState?.available && !updateState.dismissed && updateState.info;

  const containerStyle: React.CSSProperties = {
    width: tokens.extension.width,
    height: tokens.extension.height,
    fontFamily: tokens.font.family,
    backgroundColor: colors.background,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      {showBanner && (
        <UpdateBanner
          version={updateState.info!.version}
          onUpdate={handleUpdate}
          onDismiss={handleDismissUpdate}
        />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view.type === 'loading' && <CenterMessage text={t('common:loading')} />}
        {view.type === 'setup' && (
          <SetupPasswordForm onSwitchToLogin={() => setView({ type: 'login' })} />
        )}
        {view.type === 'register' && <RegisterForm onSwitchToLogin={() => setView({ type: 'login' })} />}
        {view.type === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setView({ type: 'register' })}
            onSwitchToSetup={() => setView({ type: 'setup' })}
          />
        )}
        {view.type === 'locked' && <LockScreen />}

        {view.type === 'vault-list' && (
          <VaultList
            onItemClick={(id) => setView({ type: 'vault-detail', id })}
            onAddItem={() => setView({ type: 'vault-add' })}
            onManageFolders={() => setView({ type: 'folders' })}
            onSettings={() => setView({ type: 'settings' })}
          />
        )}
        {view.type === 'folders' && (
          <FolderManagement onBack={() => setView({ type: 'vault-list' })} />
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
        {view.type === 'share' && <SharePage onBack={() => { setActiveTab('vault' as NavTab); setView({ type: 'vault-list' }); }} />}
        {view.type === 'settings' && (
          <SettingsPage
            onBack={() => setView({ type: 'vault-list' })}
            onExport={() => setView({ type: 'export' })}
            onImport={() => setView({ type: 'import' })}
          />
        )}
        {view.type === 'export' && <ExportVault onBack={() => setView({ type: 'settings' })} />}
        {view.type === 'import' && <ImportPasswords onBack={() => setView({ type: 'settings' })} />}
        {view.type === 'health' && <SecurityHealth onBack={() => { setActiveTab('vault' as NavTab); setView({ type: 'vault-list' }); }} />}
      </div>

      {showBottomNav && <BottomNav active={activeTab} onChange={handleTabChange} />}
      <ToastContainer />
    </div>
  );
}

function CenterMessage({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <div style={centerStyle}>
      <span style={{ color: colors.secondary, fontFamily: tokens.font.family, fontSize: tokens.font.size.base }}>
        {text}
      </span>
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};
