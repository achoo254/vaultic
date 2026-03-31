// Web app route definitions
import { Routes, Route, Navigate } from 'react-router';
import { AuthGuard } from './components/auth-guard';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { VaultPage } from './pages/vault-page';
import { SettingsPage } from './pages/settings-page';
import { OnboardingPage } from './pages/onboarding-page';
import { SharePage } from './pages/share-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vault" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/vault" element={<AuthGuard><VaultPage /></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
      <Route path="/share" element={<AuthGuard><SharePage /></AuthGuard>} />
    </Routes>
  );
}
