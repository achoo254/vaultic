// Screen 09: Password Generator — standalone tab view
import React, { useState, useCallback } from 'react';
import { Button, VStack, HStack, Card, tokens, useTheme } from '@vaultic/ui';
import { IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { generatePassword } from '@vaultic/crypto';
import { CopyButton } from '../common/copy-button';

export function PasswordGeneratorView() {
  const { colors } = useTheme();
  const { t } = useTranslation(['vault', 'common']);
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

  const strengthLabel = strength <= 2
    ? t('common:strength.weak')
    : strength <= 3
      ? t('common:strength.medium')
      : t('common:strength.strong');
  const strengthColor = strength <= 2 ? colors.error : strength <= 3 ? colors.warning : colors.success;

  const passwordText: React.CSSProperties = {
    flex: 1, fontFamily: 'monospace', fontSize: tokens.font.size.base,
    color: colors.text, wordBreak: 'break-all',
  };
  const regenBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' };
  const strengthBarBg: React.CSSProperties = { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: tokens.radius.full, overflow: 'hidden' };
  const strengthBarFill: React.CSSProperties = { height: '100%', borderRadius: tokens.radius.full, transition: 'width 0.2s, background-color 0.2s' };
  const strengthLabelStyle: React.CSSProperties = { fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, fontFamily: tokens.font.family, minWidth: 50 };
  const optionLabel: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.text, fontFamily: tokens.font.family };
  const toggleRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

  function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    const toggleTrack: React.CSSProperties = {
      width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      position: 'relative', transition: 'background-color 0.2s', padding: 2,
      display: 'flex', alignItems: 'center',
      backgroundColor: checked ? colors.primary : colors.border,
    };
    const toggleThumb: React.CSSProperties = {
      width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
      transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transform: checked ? 'translateX(16px)' : 'translateX(0)',
    };
    return (
      <div style={toggleRowStyle}>
        <span style={optionLabel}>{label}</span>
        <button type="button" onClick={() => onChange(!checked)} style={toggleTrack}>
          <div style={toggleThumb} />
        </button>
      </div>
    );
  }

  return (
    <VStack gap="lg" style={{ padding: tokens.spacing.xl, height: '100%' }}>
      {/* Generated password display */}
      <Card variant="outlined" padding="md" style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, backgroundColor: colors.surface }}>
        <div style={passwordText}>{password}</div>
        <HStack gap="xs" style={{ flexShrink: 0 }}>
          <CopyButton text={password} size={16} />
          <button onClick={regenerate} style={regenBtn} title={t('vault:generator.regenerate')}>
            <IconRefresh size={16} stroke={1.5} color={colors.secondary} />
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
        <span style={optionLabel}>{t('vault:generator.length', { length })}</span>
        <input type="range" min={8} max={64} value={length} onChange={(e) => { setLength(+e.target.value); regenerate(); }} style={{ flex: 1 }} />
      </HStack>

      {/* Toggles */}
      <ToggleRow label={t('vault:generator.uppercase')} checked={uppercase} onChange={setUppercase} />
      <ToggleRow label={t('vault:generator.lowercase')} checked={lowercase} onChange={setLowercase} />
      <ToggleRow label={t('vault:generator.numbers')} checked={digits} onChange={setDigits} />
      <ToggleRow label={t('vault:generator.symbols')} checked={symbols} onChange={setSymbols} />

      <Button variant="primary" size="md" onClick={regenerate} style={{ width: '100%', marginTop: 'auto' }}>
        {t('vault:generator.regenerate')}
      </Button>
    </VStack>
  );
}
