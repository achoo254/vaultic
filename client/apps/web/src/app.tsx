// Web app root layout — responsive container centered at 480px max width
import { useEffect } from 'react';
import { useTheme } from '@vaultic/ui';
import { AppRouter } from './router';
import { useAuthStore } from './stores/auth-store';

export function App() {
  const { colors } = useTheme();
  const hydrate = useAuthStore((s) => s.hydrate);

  // Hydrate auth state from web storage on mount
  useEffect(() => {
    hydrate();
  }, []);

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100vh',
        background: colors.background,
        color: colors.text,
        padding: '0 16px',
      }}
    >
      <AppRouter />
    </div>
  );
}
