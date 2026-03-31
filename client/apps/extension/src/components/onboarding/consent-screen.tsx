// First-run privacy consent disclosure — required by Chrome Web Store
// Shows once on first extension open, must accept before using extension
import React from 'react';
import { Button, tokens, useTheme } from '@vaultic/ui';
import { IconShieldLock, IconCheck } from '@tabler/icons-react';

const PRIVACY_URL = 'https://vaultic.inetdev.io.vn/privacy-policy';
const TERMS_URL = 'https://vaultic.inetdev.io.vn/terms';

interface ConsentScreenProps {
  onAccept: () => void;
}

export function ConsentScreen({ onAccept }: ConsentScreenProps) {
  const { colors } = useTheme();

  const openLink = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div style={{
      width: tokens.extension.width,
      height: tokens.extension.height,
      fontFamily: tokens.font.family,
      backgroundColor: colors.surface,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: tokens.spacing.xxl,
      boxSizing: 'border-box',
    }}>
      {/* Icon */}
      <div style={{ marginTop: tokens.spacing.xxxl, marginBottom: tokens.spacing.lg }}>
        <IconShieldLock size={56} stroke={1.5} color={colors.primary} />
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: tokens.font.size.xl,
        fontWeight: tokens.font.weight.bold,
        color: colors.text,
        margin: 0,
        marginBottom: tokens.spacing.md,
        textAlign: 'center',
      }}>
        Privacy & Security
      </h1>

      {/* Description */}
      <p style={{
        fontSize: tokens.font.size.base,
        color: colors.secondary,
        lineHeight: tokens.font.lineHeight.relaxed,
        textAlign: 'center',
        margin: 0,
        marginBottom: tokens.spacing.xl,
      }}>
        Vaultic stores your passwords locally on your device
        using AES-256-GCM encryption.
      </p>

      {/* Bullet points */}
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        marginBottom: tokens.spacing.xxl,
        width: '100%',
      }}>
        {[
          'Your master password never leaves your device',
          'Vault data is encrypted before any sync',
          'No analytics, no tracking, no ads',
          'Cloud Sync is optional and off by default',
        ].map((text) => (
          <li key={text} style={{
            fontSize: tokens.font.size.sm,
            color: colors.text,
            lineHeight: tokens.font.lineHeight.relaxed,
            padding: `${tokens.spacing.xs}px 0`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: tokens.spacing.sm,
          }}>
            <IconCheck size={tokens.icon.size.sm} stroke={tokens.icon.strokeWidth} style={{ color: colors.success, flexShrink: 0 }} />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Legal links */}
      <p style={{
        fontSize: tokens.font.size.xs,
        color: colors.secondary,
        textAlign: 'center',
        margin: 0,
        marginBottom: tokens.spacing.lg,
        lineHeight: tokens.font.lineHeight.normal,
      }}>
        By continuing, you agree to our{' '}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); openLink(PRIVACY_URL); }}
          style={{ color: colors.primary, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Privacy Policy
        </a>{' '}
        and{' '}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); openLink(TERMS_URL); }}
          style={{ color: colors.primary, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Terms of Service
        </a>.
      </p>

      {/* CTA */}
      <Button
        onClick={onAccept}
        style={{ width: '100%' }}
      >
        Get Started
      </Button>
    </div>
  );
}
