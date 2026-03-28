// Overlay dialog for confirms/detail views using design tokens

import React, { useEffect } from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, title, style }) => {
  const { colors } = useTheme();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: tokens.spacing.lg,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
    ...style,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.semibold,
    fontFamily: tokens.font.family,
    color: colors.text,
    marginBottom: tokens.spacing.md,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {title && <div style={titleStyle}>{title}</div>}
        {children}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
