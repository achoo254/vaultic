// Uppercase section label for settings, detail views

import React from 'react';
import { tokens } from '../styles/design-tokens';
import { useTheme } from '../styles/theme-provider';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ children, style, ...props }) => {
  const { colors } = useTheme();
  const headerStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.semibold,
    color: colors.secondary,
    fontFamily: tokens.font.family,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...style,
  };

  return (
    <div style={headerStyle} {...props}>
      {children}
    </div>
  );
};

SectionHeader.displayName = 'SectionHeader';
