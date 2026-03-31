// Screen 15: Share Link Created — success + copy link + expiry info
import React, { useState } from 'react';
import { Button, tokens, useTheme } from '@vaultic/ui';
import { IconArrowLeft, IconCircleCheck, IconCopy, IconCheck, IconClock, IconEye } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ShareLinkResultProps {
  shareUrl: string;
  ttlHours: number | null;
  maxViews: number | null;
  warning?: string;
  onDone: () => void;
}

export function ShareLinkResult({ shareUrl, ttlHours, maxViews, warning, onDone }: ShareLinkResultProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['share', 'common']);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    chrome.runtime?.sendMessage?.({ type: 'schedule-clipboard-clear' }).catch(() => {});
  };

  const expiryText = ttlHours
    ? ttlHours >= 168 ? t('share:options.ttl.7d') : ttlHours >= 24 ? t('share:options.ttl.24h') : `${ttlHours} hour(s)`
    : t('share:link.noExpiry');
  const viewsText = maxViews
    ? t(maxViews > 1 ? 'share:link.viewCount_other' : 'share:link.viewCount', { count: maxViews })
    : t('share:link.unlimitedViews');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header — design screen 15: arrow-left + "Link Created" */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, height: 52,
        padding: `0 ${tokens.spacing.lg}px`, borderBottom: `1px solid ${colors.border}`,
      }}>
        <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex', alignItems: 'center' }}>
          <IconArrowLeft size={20} stroke={1.5} />
        </button>
        <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          {t('share:link.title')}
        </span>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 24px', flex: 1, overflowY: 'auto', alignItems: 'center' }}>
        {/* Success icon — 64px circle with green background */}
        <div style={{
          width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconCircleCheck size={32} stroke={1.5} color={colors.success} />
        </div>

        <div style={{
          fontSize: 20, fontWeight: tokens.font.weight.bold, color: colors.text,
          fontFamily: tokens.font.family, textAlign: 'center',
        }}>
          {t('share:link.success')}
        </div>

        {/* Link box — design: fill surface, height 48, copy icon blue */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', backgroundColor: colors.surface, borderRadius: 8, height: 48, width: '100%',
        }}>
          <span style={{
            fontSize: 13, fontWeight: tokens.font.weight.medium, color: colors.text,
            fontFamily: tokens.font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {shareUrl}
          </span>
          <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
            {copied
              ? <IconCheck size={18} stroke={1.5} color={colors.success} />
              : <IconCopy size={18} stroke={1.5} color={colors.primary} />
            }
          </button>
        </div>

        {/* Copy button — primary, height 44 */}
        <Button variant="primary" size="lg" onClick={handleCopy} style={{ width: '100%', height: 44, gap: 8 }}>
          {copied ? t('share:link.copied') : t('share:link.copyLink')}
        </Button>

        {warning && (
          <div style={{
            backgroundColor: colors.warningBg, borderRadius: 8, padding: '8px 12px', width: '100%',
            fontSize: tokens.font.size.xs, color: colors.warningText, fontFamily: tokens.font.family, lineHeight: 1.4,
          }}>
            {warning}
          </div>
        )}

        {/* Expiry info card — design: fill surface light, padding 16, cornerRadius 8 */}
        <div style={{
          backgroundColor: colors.surface, borderRadius: 8, padding: 16, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: tokens.font.weight.semibold, color: colors.secondary, fontFamily: tokens.font.family }}>
            {t('share:link.expireTitle')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, fontFamily: tokens.font.family }}>
            <IconClock size={14} stroke={1.5} color={colors.secondary} />
            {t('share:link.afterTime', { time: expiryText })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, fontFamily: tokens.font.family }}>
            <IconEye size={14} stroke={1.5} color={colors.secondary} />
            {t('share:link.afterViews', { views: viewsText })}
          </div>
          <div style={{ fontSize: 11, fontWeight: tokens.font.weight.medium, color: colors.secondary, fontFamily: tokens.font.family }}>
            {t('share:link.whicheverFirst')}
          </div>
        </div>

        {/* Done button — outlined, height 44 */}
        <button onClick={onDone} style={{
          width: '100%', height: 44, borderRadius: 8, border: `1px solid ${colors.border}`,
          background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tokens.font.weight.medium,
          color: colors.text, fontFamily: tokens.font.family, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {t('common:done')}
        </button>
      </div>
    </div>
  );
}
