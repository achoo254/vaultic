// Screen 09: Password Generator — standalone tab view
import React, { useState, useCallback } from 'react';
import { Button } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { generatePassword } from '@vaultic/crypto';
import { CopyButton } from '../common/copy-button';

export function PasswordGeneratorView() {
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState(() =>
    generatePassword({ length: 20, uppercase: true, lowercase: true, digits: true, symbols: true }),
  );

  const regenerate = useCallback(() => {
    setPassword(generatePassword({ length, uppercase, lowercase, digits, symbols }));
  }, [length, uppercase, lowercase, digits, symbols]);

  // Calculate strength
  let strength = 0;
  if (length >= 12) strength++;
  if (length >= 16) strength++;
  if (uppercase) strength++;
  if (digits) strength++;
  if (symbols) strength++;
  const strengthLabel = strength <= 2 ? 'Weak' : strength <= 3 ? 'Medium' : 'Strong';
  const strengthColor = strength <= 2 ? tokens.colors.error : strength <= 3 ? tokens.colors.warning : tokens.colors.success;

  return (
    <div style={containerStyle}>
      {/* Generated password display */}
      <div style={passwordDisplay}>
        <div style={passwordText}>{password}</div>
        <div style={passwordActions}>
          <CopyButton text={password} label="📋" />
          <button onClick={regenerate} style={regenBtn} title="Regenerate">🔄</button>
        </div>
      </div>

      {/* Strength bar */}
      <div style={strengthSection}>
        <div style={strengthBarBg}>
          <div style={{ ...strengthBarFill, width: `${(strength / 5) * 100}%`, backgroundColor: strengthColor }} />
        </div>
        <span style={{ ...strengthLabelStyle, color: strengthColor }}>{strengthLabel}</span>
      </div>

      {/* Length slider */}
      <div style={optionRow}>
        <span style={optionLabel}>Length: {length}</span>
        <input type="range" min={8} max={64} value={length} onChange={(e) => { setLength(+e.target.value); regenerate(); }} style={{ flex: 1 }} />
      </div>

      {/* Toggles */}
      <Toggle label="Uppercase (A-Z)" checked={uppercase} onChange={(v) => { setUppercase(v); }} />
      <Toggle label="Lowercase (a-z)" checked={lowercase} onChange={(v) => { setLowercase(v); }} />
      <Toggle label="Numbers (0-9)" checked={digits} onChange={(v) => { setDigits(v); }} />
      <Toggle label="Symbols (!@#$)" checked={symbols} onChange={(v) => { setSymbols(v); }} />

      <Button variant="primary" size="md" onClick={regenerate} style={{ width: '100%', marginTop: 'auto' }}>
        Regenerate
      </Button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={toggleRow}>
      <span style={optionLabel}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg,
  padding: tokens.spacing.xl, height: '100%',
};
const passwordDisplay: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  padding: tokens.spacing.md, backgroundColor: tokens.colors.surface,
  borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.border}`,
};
const passwordText: React.CSSProperties = {
  flex: 1, fontFamily: 'monospace', fontSize: tokens.font.size.base,
  color: tokens.colors.text, wordBreak: 'break-all',
};
const passwordActions: React.CSSProperties = { display: 'flex', gap: 4, flexShrink: 0 };
const regenBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 };
const strengthSection: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.sm };
const strengthBarBg: React.CSSProperties = { flex: 1, height: 6, backgroundColor: tokens.colors.border, borderRadius: tokens.radius.full, overflow: 'hidden' };
const strengthBarFill: React.CSSProperties = { height: '100%', borderRadius: tokens.radius.full, transition: 'width 0.2s, background-color 0.2s' };
const strengthLabelStyle: React.CSSProperties = { fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, fontFamily: tokens.font.family, minWidth: 50 };
const optionRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.md };
const optionLabel: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family };
const toggleRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' };
