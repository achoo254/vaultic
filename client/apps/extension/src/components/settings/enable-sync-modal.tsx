// Modal confirming Cloud Sync activation — design spec "19a. Enable Sync Warning"
import React from 'react';
import { tokens, Modal, Button, useTheme } from '@vaultic/ui';
import { Cloud, ShieldCheck } from 'lucide-react';

interface EnableSyncModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function EnableSyncModal({ open, onClose, onConfirm }: EnableSyncModalProps) {
  const { colors } = useTheme();

  return (
    <Modal open={open} onClose={onClose} style={{ padding: tokens.spacing.xxl, maxWidth: 320 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacing.lg }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: tokens.radius.full,
          backgroundColor: '#EFF6FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Cloud size={24} strokeWidth={1.5} color={colors.primary} />
        </div>

        {/* Title */}
        <div style={{
          fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold,
          color: colors.text, fontFamily: tokens.font.family,
        }}>
          Enable Cloud Sync?
        </div>

        {/* Description */}
        <div style={{
          fontSize: tokens.font.size.sm, color: colors.secondary,
          fontFamily: tokens.font.family, lineHeight: tokens.font.lineHeight.normal,
          textAlign: 'center', width: 272,
        }}>
          Your encrypted vault will be stored on the server. Only you can decrypt it with your master password.
        </div>

        {/* Warning badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
          backgroundColor: colors.badgeWarningBg, borderRadius: tokens.radius.md,
          padding: `${tokens.spacing.sm + 2}px ${tokens.spacing.md + 2}px`,
          width: '100%',
        }}>
          <ShieldCheck size={16} strokeWidth={1.5} color={colors.badgeWarningText} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.medium,
            color: colors.badgeWarningText, fontFamily: tokens.font.family,
          }}>
            Zero-knowledge: server cannot read your data
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: tokens.spacing.md, width: '100%' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1, height: 40 }}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm} style={{ flex: 1, height: 40 }}>
            Enable
          </Button>
        </div>
      </div>
    </Modal>
  );
}
