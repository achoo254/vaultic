// Web app root — hydrates auth, provides theme background for full viewport
import { useEffect } from 'react';
import { useTheme } from '@vaultic/ui';
import { AppRouter } from './router';
import { useAuthStore } from './stores/auth-store';

export function App() {
  const { colors } = useTheme();
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      color: colors.text,
    }}>
      <AppRouter />
    </div>
  );
}
