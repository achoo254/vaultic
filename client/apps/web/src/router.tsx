// Web app route definitions — authenticated routes wrapped in responsive AppLayout
import { Routes, Route, Navigate } from 'react-router';
import { AuthGuard } from './components/auth-guard';
import { AppLayout } from './components/app-layout';
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
      {/* Authenticated routes with responsive layout shell */}
      <Route path="/vault" element={<AuthGuard><AppLayout><VaultPage /></AppLayout></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard><AppLayout><SettingsPage /></AppLayout></AuthGuard>} />
      <Route path="/share" element={<AuthGuard><AppLayout><SharePage /></AppLayout></AuthGuard>} />
    </Routes>
  );
}
