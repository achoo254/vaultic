// Modal shown when user disables Cloud Sync — choose to delete or keep server data
import React from 'react';
import { tokens, Modal, useTheme } from '@vaultic/ui';
import { CloudOff, Trash2, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DisableSyncModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteData: boolean) => void;
}

export function DisableSyncModal({ open, onClose, onConfirm }: DisableSyncModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Modal open={open} onClose={onClose} title="">
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          backgroundColor: `${colors.error}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CloudOff size={24} strokeWidth={1.5} color={colors.error} />
        </div>

        {/* Title */}
        <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          {t('settings:sync.disableModal.title')}
        </div>

        {/* Description */}
        <p style={{ fontSize: tokens.font.size.sm, color: colors.secondary, fontFamily: tokens.font.family, lineHeight: 1.5, margin: 0 }}>
          {t('settings:sync.disableModal.description')}
        </p>

        {/* Delete from server */}
        <button onClick={() => onConfirm(true)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm,
          width: '100%', padding: `${tokens.spacing.md}px`, borderRadius: tokens.radius.md,
          border: `1px solid ${colors.error}30`, backgroundColor: `${colors.error}08`,
          color: colors.error, fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium,
          fontFamily: tokens.font.family, cursor: 'pointer',
        }}>
          <Trash2 size={16} strokeWidth={1.5} /> {t('settings:sync.disableModal.deleteServer')}
        </button>
        <p style={{ fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family, margin: `-${tokens.spacing.xs}px 0 0 0`, lineHeight: 1.4 }}>
          {t('settings:sync.disableModal.deleteHint')}
        </p>

        {/* Keep on server (frozen) */}
        <button onClick={() => onConfirm(false)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm,
          width: '100%', padding: `${tokens.spacing.md}px`, borderRadius: tokens.radius.md,
          border: `1px solid ${colors.border}`, backgroundColor: 'transparent',
          color: colors.text, fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium,
          fontFamily: tokens.font.family, cursor: 'pointer',
        }}>
          <Pause size={16} strokeWidth={1.5} /> {t('settings:sync.disableModal.keepServer')}
        </button>
        <p style={{ fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family, margin: `-${tokens.spacing.xs}px 0 0 0`, lineHeight: 1.4 }}>
          {t('settings:sync.disableModal.keepHint')}
        </p>

        {/* Cancel */}
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: colors.primary,
          fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium,
          fontFamily: tokens.font.family, cursor: 'pointer', padding: `${tokens.spacing.xs}px 0`,
          textAlign: 'left',
        }}>
          {t('common:cancel')}
        </button>
      </div>
    </Modal>
  );
}
