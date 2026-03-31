// Route guard — shows loading spinner until hydration completes, then redirects or renders
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { tokens, useTheme } from '@vaultic/ui';
import { useAuthStore } from '../stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Require unlocked vault to render children */
  requireUnlocked?: boolean;
}

/** Wraps protected routes — waits for hydrate(), then redirects if not authenticated */
export function AuthGuard({ children, requireUnlocked = true }: AuthGuardProps) {
  const { colors } = useTheme();
  const vaultState = useAuthStore((s) => s.vaultState);
  const [hydrated, setHydrated] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate().then(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: colors.secondary, fontFamily: tokens.font.family }}>
        Loading...
      </div>
    );
  }

  if (vaultState === 'no_vault') return <Navigate to="/login" replace />;
  if (requireUnlocked && vaultState === 'locked') return <Navigate to="/login" replace />;

  return <>{children}</>;
}
