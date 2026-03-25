// Skeleton loader for vault list loading state (Screen 20)
import React from 'react';
import { tokens } from '@vaultic/ui';

/** Vault list skeleton — 3 rows with circle + 2 line placeholders. */
export function VaultListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={containerStyle}>
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

const shimmer = `linear-gradient(90deg, ${tokens.colors.surface} 25%, #e8e8eb 50%, ${tokens.colors.surface} 75%)`;
const containerStyle: React.CSSProperties = { padding: tokens.spacing.md, display: 'flex', flexDirection: 'column', gap: tokens.spacing.md };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.md };
const circle: React.CSSProperties = { width: 36, height: 36, borderRadius: tokens.radius.md, background: shimmer, backgroundSize: '200% 100%', flexShrink: 0 };
const linesStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 };
const line: React.CSSProperties = { height: 12, borderRadius: 4, background: shimmer, backgroundSize: '200% 100%' };
