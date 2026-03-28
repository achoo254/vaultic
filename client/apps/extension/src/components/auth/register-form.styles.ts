// Style factory for RegisterForm and SetupPasswordForm — accepts colors from useTheme()
import React from 'react';
import { tokens } from '@vaultic/ui';
import type { ThemeColors } from '@vaultic/ui';

export function getStyles(colors: ThemeColors) {
  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacing.xxl,
    gap: tokens.spacing.lg,
    height: '100%',
  };

  const logoSection: React.CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
    paddingTop: tokens.spacing.md,
  };

  const logoText: React.CSSProperties = {
    fontSize: tokens.font.size.xxl,
    fontWeight: tokens.font.weight.bold,
    color: colors.primary,
    fontFamily: tokens.font.family,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xl,
    fontWeight: tokens.font.weight.semibold,
    color: colors.text,
    fontFamily: tokens.font.family,
  };

  const fieldsSection: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    flex: 1,
  };

  const actionsSection: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    alignItems: 'center',
  };

  const linkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.primary,
    cursor: 'pointer',
    fontSize: tokens.font.size.sm,
    fontFamily: tokens.font.family,
  };

  const eyeToggleStyle: React.CSSProperties = {
    position: 'absolute',
    right: 12,
    top: 30,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: 4,
  };

  const strengthBarContainer: React.CSSProperties = {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: tokens.radius.full,
    marginTop: tokens.spacing.xs,
    overflow: 'hidden',
  };

  const strengthBar: React.CSSProperties = {
    height: '100%',
    borderRadius: tokens.radius.full,
    transition: 'width 0.2s, background-color 0.2s',
  };

  return {
    formStyle,
    logoSection,
    logoText,
    headingStyle,
    fieldsSection,
    actionsSection,
    linkStyle,
    eyeToggleStyle,
    strengthBarContainer,
    strengthBar,
  };
}
