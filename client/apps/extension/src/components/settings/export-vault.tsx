// Screen 23: Export Vault — encrypted (.vaultic) or CSV format
import React, { useState } from 'react';
import { Button, VStack, HStack, tokens, useTheme } from '@vaultic/ui';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../stores/vault-store';

interface ExportVaultProps { onBack: () => void; }

export function ExportVault({ onBack }: ExportVaultProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common']);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [loading, setLoading] = useState(false);
  const items = useVaultStore((s) => s.items);

  const handleExport = async () => {
    setLoading(true);
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const header = 'name,url,username,password,notes';
        const rows = items.map((i) => {
          const c = i.credential;
          return [c.name, c.url || '', c.username || '', c.password || '', c.notes || '']
            .map((f) => `"${f.replace(/"/g, '""')}"`)
            .join(',');
        });
        content = [header, ...rows].join('\n');
        filename = 'vaultic-export.csv';
        mimeType = 'text/csv';
      } else {
        // json format — plaintext, warn user before download
        content = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), items: items.map((i) => i.credential) }, null, 2);
        filename = 'vaultic-export.json';
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
  const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`, borderBottom: `1px solid ${colors.border}` };
  const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex', alignItems: 'center' };
  const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family };
  const descStyle: React.CSSProperties = { fontSize: tokens.font.size.base, color: colors.secondary, fontFamily: tokens.font.family, textAlign: 'center' };
  const optionBtn: React.CSSProperties = { flex: 1, padding: tokens.spacing.md, border: `1px solid ${colors.border}`, borderRadius: tokens.radius.md, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2, backgroundColor: 'transparent' };
  const optionActive: React.CSSProperties = { ...optionBtn, borderColor: colors.primary, backgroundColor: 'rgba(37,99,235,0.05)' };
  const optionLabel: React.CSSProperties = { fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium, color: colors.text, fontFamily: tokens.font.family };
  const optionHint: React.CSSProperties = { fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family };
  const warningStyle: React.CSSProperties = { backgroundColor: colors.warningBg, padding: tokens.spacing.md, borderRadius: tokens.radius.md, fontSize: tokens.font.size.sm, color: colors.warningText, fontFamily: tokens.font.family, display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={18} strokeWidth={1.5} /></button>
        <span style={titleStyle}>{t('settings:export.title')}</span>
      </div>
      <VStack gap="lg" style={{ padding: tokens.spacing.xxl, flex: 1, justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}><Download size={36} strokeWidth={1.5} color={colors.primary} /></div>
        <div style={descStyle}>{t('settings:export.description')}</div>

        <HStack gap="sm">
          <label style={format === 'json' ? optionActive : optionBtn}>
            <input type="radio" name="format" checked={format === 'json'} onChange={() => setFormat('json')} style={{ display: 'none' }} />
            <span style={optionLabel}>{t('settings:export.json')}</span>
            <span style={optionHint}>{t('settings:export.jsonHint')}</span>
          </label>
          <label style={format === 'csv' ? optionActive : optionBtn}>
            <input type="radio" name="format" checked={format === 'csv'} onChange={() => setFormat('csv')} style={{ display: 'none' }} />
            <span style={optionLabel}>{t('settings:export.csv')}</span>
            <span style={optionHint}>{t('settings:export.csvHint')}</span>
          </label>
        </HStack>

        {format === 'json' && (
          <div style={warningStyle}>
            <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} /> {t('settings:export.jsonWarning')}
          </div>
        )}

        {format === 'csv' && (
          <div style={warningStyle}>
            <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} /> {t('settings:export.csvWarning')}
          </div>
        )}

        <Button variant="primary" size="lg" loading={loading} onClick={handleExport} style={{ width: '100%' }}>
          {t('settings:export.button', { count: items.length })}
        </Button>
      </VStack>
    </div>
  );
}
