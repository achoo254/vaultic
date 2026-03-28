// Screen 15: Share Link Created — success + copy link + expiry info
import React, { useState } from 'react';
import { Button, tokens, useTheme } from '@vaultic/ui';
import { CheckCircle, Copy, Check } from 'lucide-react';

interface ShareLinkResultProps {
  shareUrl: string;
  ttlHours: number | null;
  maxViews: number | null;
  warning?: string;
  onDone: () => void;
}

export function ShareLinkResult({ shareUrl, ttlHours, maxViews, warning, onDone }: ShareLinkResultProps) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Schedule clipboard clear in background (survives popup close)
    chrome.runtime?.sendMessage?.({ type: 'schedule-clipboard-clear' }).catch(() => {});
  };

  const expiryText = ttlHours
    ? ttlHours >= 168 ? '7 days' : ttlHours >= 24 ? '24 hours' : `${ttlHours} hour(s)`
    : 'No expiry';
  const viewsText = maxViews ? `${maxViews} view(s)` : 'Unlimited views';

  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg,
    padding: tokens.spacing.xxl, height: '100%', justifyContent: 'center',
  };
  const headingStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold,
    color: colors.text, fontFamily: tokens.font.family, textAlign: 'center',
  };
  const linkBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
    padding: tokens.spacing.md, backgroundColor: colors.surface,
    borderRadius: tokens.radius.md, border: `1px solid ${colors.border}`,
  };
  const linkText: React.CSSProperties = {
    flex: 1, fontSize: tokens.font.size.sm, color: colors.text,
    fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4,
  };
  const copyIcon: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0,
  };
  const infoCard: React.CSSProperties = {
    padding: tokens.spacing.md, backgroundColor: colors.surface,
    borderRadius: tokens.radius.md, display: 'flex', flexDirection: 'column', gap: 4,
  };
  const infoRow: React.CSSProperties = { fontSize: tokens.font.size.sm, color: colors.text, fontFamily: tokens.font.family };
  const infoLabel: React.CSSProperties = { fontWeight: tokens.font.weight.medium };
  const infoHint: React.CSSProperties = { fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family };
  const warningStyle: React.CSSProperties = {
    backgroundColor: '#fef3c7', borderRadius: 8, padding: '8px 12px',
    fontSize: tokens.font.size.xs, color: '#92400e', fontFamily: tokens.font.family, lineHeight: 1.4,
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center' }}>
        <CheckCircle size={48} strokeWidth={1.5} color={colors.success} />
      </div>
      <div style={headingStyle}>Secure Link Created!</div>

      <div style={linkBox}>
        <div style={linkText}>{shareUrl}</div>
        <button onClick={handleCopy} style={copyIcon}>
          {copied ? <Check size={16} strokeWidth={1.5} color={colors.success} /> : <Copy size={16} strokeWidth={1.5} color={colors.secondary} />}
        </button>
      </div>

      <Button variant="primary" size="lg" onClick={handleCopy} style={{ width: '100%' }}>
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>

      {warning && (
        <div style={warningStyle}>{warning}</div>
      )}

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
