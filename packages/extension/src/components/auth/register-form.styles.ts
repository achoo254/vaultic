// Style constants for RegisterForm component
import React from 'react';
import { tokens } from '@vaultic/ui';

export const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: tokens.spacing.xxl,
  gap: tokens.spacing.lg,
  height: '100%',
};

export const logoSection: React.CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.sm,
  paddingTop: tokens.spacing.md,
};

export const logoText: React.CSSProperties = {
  fontSize: tokens.font.size.xxl,
  fontWeight: tokens.font.weight.bold,
  color: tokens.colors.primary,
  fontFamily: tokens.font.family,
};

export const headingStyle: React.CSSProperties = {
  fontSize: tokens.font.size.xl,
  fontWeight: tokens.font.weight.semibold,
  color: tokens.colors.text,
  fontFamily: tokens.font.family,
};

export const fieldsSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
  flex: 1,
};

export const actionsSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
  alignItems: 'center',
};

export const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: tokens.colors.primary,
  cursor: 'pointer',
  fontSize: tokens.font.size.sm,
  fontFamily: tokens.font.family,
};

export const eyeToggleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: 30,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 4,
};

export const strengthBarContainer: React.CSSProperties = {
  height: 4,
  backgroundColor: tokens.colors.border,
  borderRadius: tokens.radius.full,
  marginTop: tokens.spacing.xs,
  overflow: 'hidden',
};

export const strengthBar: React.CSSProperties = {
  height: '100%',
  borderRadius: tokens.radius.full,
  transition: 'width 0.2s, background-color 0.2s',
};
