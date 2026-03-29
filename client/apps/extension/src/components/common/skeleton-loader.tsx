// Skeleton loader for vault list loading state (Screen 20)
import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';

/** Vault list skeleton — 3 rows with circle + 2 line placeholders. */
export function VaultListSkeleton({ rows = 3 }: { rows?: number }) {
  const { colors } = useTheme();

  const shimmerBg = `linear-gradient(90deg, ${colors.surface} 25%, ${colors.border} 50%, ${colors.surface} 75%)`;
  const shimmerStyle: React.CSSProperties = { background: shimmerBg, backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' };
  const containerStyle: React.CSSProperties = { padding: tokens.spacing.md, display: 'flex', flexDirection: 'column', gap: tokens.spacing.md };
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.md };
  const circle: React.CSSProperties = { width: 36, height: 36, borderRadius: tokens.radius.md, flexShrink: 0, ...shimmerStyle };
  const linesStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 };
  const line: React.CSSProperties = { height: 12, borderRadius: 4, ...shimmerStyle };

  return (
    <div style={containerStyle}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={rowStyle}>
          <div style={circle} />
          <div style={linesStyle}>
            <div style={{ ...line, width: '60%' }} />
            <div style={{ ...line, width: '40%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
