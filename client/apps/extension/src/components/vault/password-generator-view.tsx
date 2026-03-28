// Screen 09: Password Generator — standalone tab view
import React, { useState, useCallback } from 'react';
import { Button, VStack, HStack, Card, tokens } from '@vaultic/ui';
import { RefreshCw } from 'lucide-react';
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
    <VStack gap="lg" style={{ padding: tokens.spacing.xl, height: '100%' }}>
      {/* Generated password display */}
      <Card variant="outlined" padding="md" style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, backgroundColor: tokens.colors.surface }}>
        <div style={passwordText}>{password}</div>
        <HStack gap="xs" style={{ flexShrink: 0 }}>
          <CopyButton text={password} size={16} />
          <button onClick={regenerate} style={regenBtn} title="Regenerate">
            <RefreshCw size={16} strokeWidth={1.5} color={tokens.colors.secondary} />
          </button>
        </HStack>
      </Card>

      {/* Strength bar */}
      <HStack gap="sm">
        <div style={strengthBarBg}>
          <div style={{ ...strengthBarFill, width: `${(strength / 5) * 100}%`, backgroundColor: strengthColor }} />
        </div>
        <span style={{ ...strengthLabelStyle, color: strengthColor }}>{strengthLabel}</span>
      </HStack>

      {/* Length slider */}
      <HStack gap="md">
        <span style={optionLabel}>Length: {length}</span>
        <input type="range" min={8} max={64} value={length} onChange={(e) => { setLength(+e.target.value); regenerate(); }} style={{ flex: 1 }} />
      </HStack>

      {/* Toggles */}
      <ToggleRow label="Uppercase (A-Z)" checked={uppercase} onChange={setUppercase} />
      <ToggleRow label="Lowercase (a-z)" checked={lowercase} onChange={setLowercase} />
      <ToggleRow label="Numbers (0-9)" checked={digits} onChange={setDigits} />
      <ToggleRow label="Symbols (!@#$)" checked={symbols} onChange={setSymbols} />

      <Button variant="primary" size="md" onClick={regenerate} style={{ width: '100%', marginTop: 'auto' }}>
        Regenerate
      </Button>
    </VStack>
  );
}

const passwordText: React.CSSProperties = {
  flex: 1, fontFamily: 'monospace', fontSize: tokens.font.size.base,
  color: tokens.colors.text, wordBreak: 'break-all',
};
const regenBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' };

// iOS-style toggle switch row
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={toggleRowStyle}>
      <span style={optionLabel}>{label}</span>
      <button type="button" onClick={() => onChange(!checked)} style={{ ...toggleTrack, backgroundColor: checked ? tokens.colors.primary : tokens.colors.border }}>
        <div style={{ ...toggleThumb, transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}

const toggleRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const toggleTrack: React.CSSProperties = {
  width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
  position: 'relative', transition: 'background-color 0.2s', padding: 2,
  display: 'flex', alignItems: 'center',
};
const toggleThumb: React.CSSProperties = {
  width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
  transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};
const strengthBarBg: React.CSSProperties = { flex: 1, height: 6, backgroundColor: tokens.colors.border, borderRadius: tokens.radius.full, overflow: 'hidden' };
const strengthBarFill: React.CSSProperties = { height: '100%', borderRadius: tokens.radius.full, transition: 'width 0.2s, background-color 0.2s' };
const strengthLabelStyle: React.CSSProperties = { fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, fontFamily: tokens.font.family, minWidth: 50 };
const optionLabel: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family };
