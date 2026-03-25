// Password field with show/hide toggle + copy button
import React, { useState } from 'react';
import { tokens } from '@vaultic/ui';
import { CopyButton } from './copy-button';

interface PasswordFieldProps {
  value: string;
  label?: string;
}

export function PasswordField({ value, label = 'Password' }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={rowStyle}>
        <span style={valueStyle}>
          {visible ? value : '••••••••••••'}
        </span>
        <div style={actionsStyle}>
          <button onClick={() => setVisible(!visible)} style={iconBtn} title={visible ? 'Hide' : 'Show'}>
            {visible ? '🔒' : '👁'}
          </button>
          <CopyButton text={value} />
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const labelStyle: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const valueStyle: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: 'monospace' };
const actionsStyle: React.CSSProperties = { display: 'flex', gap: 4 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, color: tokens.colors.secondary };
