// Extension popup — main entry point

import { tokens } from '@vaultic/ui';

export function App() {
  return (
    <div
      style={{
        width: tokens.extension.width,
        height: tokens.extension.height,
        fontFamily: tokens.font.family,
        backgroundColor: tokens.colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacing.lg,
      }}
    >
      <div
        style={{
          fontSize: tokens.font.size.xxl,
          fontWeight: tokens.font.weight.bold,
          color: tokens.colors.text,
        }}
      >
        Vaultic
      </div>
      <div
        style={{
          fontSize: tokens.font.size.base,
          color: tokens.colors.secondary,
        }}
      >
        Zero-knowledge password manager
      </div>
    </div>
  );
}
