// Password field with show/hide toggle + copy button
import React, { useState } from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from './copy-button';

interface PasswordFieldProps {
  value: string;
  label?: string;
}

export function PasswordField({ value, label }: PasswordFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);

  const resolvedLabel = label ?? t('common:password');

  const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
  const labelStyle: React.CSSProperties = { fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family };
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const valueStyle: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.text, fontFamily: 'monospace' };
  const actionsStyle: React.CSSProperties = { display: 'flex', gap: 4 };
  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, color: colors.secondary };

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>{resolvedLabel}</div>
      <div style={rowStyle}>
        <span style={valueStyle}>
          {visible ? value : '••••••••••••'}
        </span>
        <div style={actionsStyle}>
          <button
            onClick={() => setVisible(!visible)}
            style={iconBtn}
            title={visible ? 'Hide' : 'Show'}
          >
            {visible ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
          <CopyButton text={value} />
        </div>
      </div>
    </div>
  );
}
