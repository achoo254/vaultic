// Screen 15: Share Link Created — success + copy link + expiry info
import React, { useState } from 'react';
import { Button, tokens, useTheme } from '@vaultic/ui';
import { ArrowLeft, CircleCheck, Copy, Check, Clock, Eye } from 'lucide-react';

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
    chrome.runtime?.sendMessage?.({ type: 'schedule-clipboard-clear' }).catch(() => {});
  };

  const expiryText = ttlHours
    ? ttlHours >= 168 ? '7 days' : ttlHours >= 24 ? '24 hours' : `${ttlHours} hour(s)`
    : 'No expiry';
  const viewsText = maxViews ? `${maxViews} view${maxViews > 1 ? 's' : ''}` : 'Unlimited views';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header — design screen 15: arrow-left + "Link Created" */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, height: 52,
        padding: `0 ${tokens.spacing.lg}px`, borderBottom: `1px solid ${colors.border}`,
      }}>
        <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          Link Created
        </span>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 24px', flex: 1, overflowY: 'auto', alignItems: 'center' }}>
        {/* Success icon — 64px circle with green background */}
        <div style={{
          width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CircleCheck size={32} strokeWidth={1.5} color="#22C55E" />
        </div>

        <div style={{
          fontSize: 20, fontWeight: tokens.font.weight.bold, color: colors.text,
          fontFamily: tokens.font.family, textAlign: 'center',
        }}>
          Secure Link Created!
        </div>

        {/* Link box — design: fill #F4F4F5, height 48, copy icon blue */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', backgroundColor: '#F4F4F5', borderRadius: 8, height: 48, width: '100%',
        }}>
          <span style={{
            fontSize: 13, fontWeight: tokens.font.weight.medium, color: colors.text,
            fontFamily: tokens.font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {shareUrl}
          </span>
          <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
            {copied
              ? <Check size={18} strokeWidth={1.5} color="#22C55E" />
              : <Copy size={18} strokeWidth={1.5} color={colors.primary} />
            }
          </button>
        </div>

        {/* Copy button — primary, height 44 */}
        <Button variant="primary" size="lg" onClick={handleCopy} style={{ width: '100%', height: 44, gap: 8 }}>
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>

        {warning && (
          <div style={{
            backgroundColor: '#fef3c7', borderRadius: 8, padding: '8px 12px', width: '100%',
            fontSize: tokens.font.size.xs, color: '#92400e', fontFamily: tokens.font.family, lineHeight: 1.4,
          }}>
            {warning}
          </div>
        )}

        {/* Expiry info card — design: fill #FAFAFA, padding 16, cornerRadius 8 */}
        <div style={{
          backgroundColor: '#FAFAFA', borderRadius: 8, padding: 16, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: tokens.font.weight.semibold, color: colors.secondary, fontFamily: tokens.font.family }}>
            This link will expire:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, fontFamily: tokens.font.family }}>
            <Clock size={14} strokeWidth={1.5} color={colors.secondary} />
            After {expiryText}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, fontFamily: tokens.font.family }}>
            <Eye size={14} strokeWidth={1.5} color={colors.secondary} />
            Or after {viewsText}
          </div>
          <div style={{ fontSize: 11, fontWeight: tokens.font.weight.medium, color: '#A1A1AA', fontFamily: tokens.font.family }}>
            Whichever comes first
          </div>
        </div>

        {/* Done button — outlined, height 44 */}
        <button onClick={onDone} style={{
          width: '100%', height: 44, borderRadius: 8, border: `1px solid ${colors.border}`,
          background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tokens.font.weight.medium,
          color: colors.text, fontFamily: tokens.font.family, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          Done
        </button>
      </div>
    </div>
  );
}
