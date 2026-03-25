// Screen 15: Share Link Created — success + copy link + expiry info
import React, { useState } from 'react';
import { Button } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';

interface ShareLinkResultProps {
  shareUrl: string;
  ttlHours: number | null;
  maxViews: number | null;
  onDone: () => void;
}

export function ShareLinkResult({ shareUrl, ttlHours, maxViews, onDone }: ShareLinkResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expiryText = ttlHours
    ? ttlHours >= 168 ? '7 days' : ttlHours >= 24 ? '24 hours' : `${ttlHours} hour(s)`
    : 'No expiry';
  const viewsText = maxViews ? `${maxViews} view(s)` : 'Unlimited views';

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 48, textAlign: 'center' }}>✅</div>
      <div style={headingStyle}>Secure Link Created!</div>

      <div style={linkBox}>
        <div style={linkText}>{shareUrl}</div>
        <button onClick={handleCopy} style={copyIcon}>{copied ? '✓' : '📋'}</button>
      </div>

      <Button variant="primary" size="lg" onClick={handleCopy} style={{ width: '100%' }}>
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>

      <div style={infoCard}>
        <div style={infoRow}><span style={infoLabel}>Expires:</span> {expiryText}</div>
        <div style={infoRow}><span style={infoLabel}>Max views:</span> {viewsText}</div>
        <div style={infoHint}>Whichever comes first</div>
      </div>

      <Button variant="secondary" size="md" onClick={onDone} style={{ width: '100%' }}>
        Done
      </Button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg,
  padding: tokens.spacing.xxl, height: '100%', justifyContent: 'center',
};
const headingStyle: React.CSSProperties = {
  fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold,
  color: tokens.colors.text, fontFamily: tokens.font.family, textAlign: 'center',
};
const linkBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  padding: tokens.spacing.md, backgroundColor: tokens.colors.surface,
  borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.border}`,
};
const linkText: React.CSSProperties = {
  flex: 1, fontSize: tokens.font.size.sm, color: tokens.colors.text,
  fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4,
};
const copyIcon: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0,
};
const infoCard: React.CSSProperties = {
  padding: tokens.spacing.md, backgroundColor: tokens.colors.surface,
  borderRadius: tokens.radius.md, display: 'flex', flexDirection: 'column', gap: 4,
};
const infoRow: React.CSSProperties = { fontSize: tokens.font.size.sm, color: tokens.colors.text, fontFamily: tokens.font.family };
const infoLabel: React.CSSProperties = { fontWeight: tokens.font.weight.medium };
const infoHint: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family };
