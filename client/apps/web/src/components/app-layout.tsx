// Responsive app shell — sidebar on desktop (≥768px), bottom nav on mobile
import { useLocation, useNavigate } from 'react-router';
import { tokens, useTheme } from '@vaultic/ui';
import { IconShieldLock, IconKey, IconSettings, IconShare, IconLock } from '@tabler/icons-react';
import { useAuthStore } from '../stores/auth-store';

const NAV_ITEMS = [
  { path: '/vault', label: 'Vault', icon: IconShieldLock },
  { path: '/share', label: 'Share', icon: IconShare },
  { path: '/settings', label: 'Settings', icon: IconSettings },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const lock = useAuthStore((s) => s.lock);
  const email = useAuthStore((s) => s.email);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop layout: sidebar + content */}
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: colors.background,
        color: colors.text,
      }}>
        {/* Sidebar — hidden on mobile via CSS */}
        <aside className="app-sidebar" style={{
          width: 240,
          borderRight: `1px solid ${colors.border}`,
          background: colors.surface,
          display: 'flex',
          flexDirection: 'column',
          padding: `${tokens.spacing.lg}px 0`,
          flexShrink: 0,
        }}>
          {/* Brand */}
          <div style={{
            padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
            marginBottom: tokens.spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}>
            <IconShieldLock size={24} stroke={1.5} color={colors.primary} />
            <span style={{
              fontSize: tokens.font.size.xl,
              fontWeight: tokens.font.weight.bold,
              fontFamily: tokens.font.family,
              color: colors.text,
            }}>Vaultic</span>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.md,
                  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
                  background: isActive(path) ? colors.primaryBg : 'transparent',
                  border: 'none',
                  borderRight: isActive(path) ? `3px solid ${colors.primary}` : '3px solid transparent',
                  cursor: 'pointer',
                  color: isActive(path) ? colors.primary : colors.secondary,
                  fontFamily: tokens.font.family,
                  fontSize: tokens.font.size.base,
                  fontWeight: isActive(path) ? tokens.font.weight.semibold : tokens.font.weight.regular,
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon size={20} stroke={1.5} />
                {label}
              </button>
            ))}
          </nav>

          {/* Footer: user + lock */}
          <div style={{
            padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
            borderTop: `1px solid ${colors.border}`,
          }}>
            {email && (
              <div style={{
                fontSize: tokens.font.size.xs,
                color: colors.secondary,
                fontFamily: tokens.font.family,
                marginBottom: tokens.spacing.sm,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{email}</div>
            )}
            <button
              onClick={() => lock()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                padding: `${tokens.spacing.sm}px 0`,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.secondary,
                fontFamily: tokens.font.family,
                fontSize: tokens.font.size.sm,
              }}
            >
              <IconLock size={16} stroke={1.5} />
              Lock vault
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="app-content" style={{
          flex: 1,
          minWidth: 0,
          padding: tokens.spacing.xxl,
          maxWidth: 960,
        }}>
          {children}
        </main>
      </div>

      {/* Bottom nav — visible on mobile only via CSS */}
      <nav className="app-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 56,
        zIndex: 50,
      }}>
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive(path) ? colors.primary : colors.secondary,
              fontFamily: tokens.font.family,
              fontSize: 10,
              fontWeight: isActive(path) ? tokens.font.weight.semibold : tokens.font.weight.regular,
            }}
          >
            <Icon size={20} stroke={1.5} />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
