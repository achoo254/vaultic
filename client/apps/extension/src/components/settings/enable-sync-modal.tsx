// Modal confirming Cloud Sync activation — design spec "19a. Enable Sync Warning"
import React from 'react';
import { tokens, Modal, Button, useTheme } from '@vaultic/ui';
import { IconCloud, IconShieldCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface EnableSyncModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function EnableSyncModal({ open, onClose, onConfirm }: EnableSyncModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Modal open={open} onClose={onClose} style={{ padding: tokens.spacing.xxl, maxWidth: 320 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacing.lg }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: tokens.radius.full,
          backgroundColor: colors.primaryBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconCloud size={24} stroke={1.5} color={colors.primary} />
        </div>

        {/* Title */}
        <div style={{
          fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold,
          color: colors.text, fontFamily: tokens.font.family,
        }}>
          {t('settings:sync.enableModal.title')}
        </div>

        {/* Description */}
        <div style={{
          fontSize: tokens.font.size.sm, color: colors.secondary,
          fontFamily: tokens.font.family, lineHeight: tokens.font.lineHeight.normal,
          textAlign: 'center', width: 272,
        }}>
          {t('settings:sync.enableModal.description')}
        </div>

        {/* Warning badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
          backgroundColor: colors.badgeWarningBg, borderRadius: tokens.radius.md,
          padding: `${tokens.spacing.sm + 2}px ${tokens.spacing.md + 2}px`,
          width: '100%',
        }}>
          <IconShieldCheck size={16} stroke={1.5} color={colors.badgeWarningText} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.medium,
            color: colors.badgeWarningText, fontFamily: tokens.font.family,
          }}>
            {t('settings:sync.enableModal.zeroKnowledge')}
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: tokens.spacing.md, width: '100%' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1, height: 40 }}>
            {t('common:cancel')}
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm} style={{ flex: 1, height: 40 }}>
            {t('common:enable')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
