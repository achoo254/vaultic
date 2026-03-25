// Screen 23: Export Vault — encrypted (.vaultic) or CSV format
import React, { useState } from 'react';
import { Button } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { useVaultStore } from '../../stores/vault-store';

interface ExportVaultProps { onBack: () => void; }

export function ExportVault({ onBack }: ExportVaultProps) {
  const [format, setFormat] = useState<'encrypted' | 'csv'>('encrypted');
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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={titleStyle}>Export Vault</span>
      </div>
      <div style={contentStyle}>
        <div style={{ fontSize: 36, textAlign: 'center' }}>📥</div>
        <div style={descStyle}>Export your vault data to a file</div>

        <div style={optionGroup}>
          <label style={format === 'encrypted' ? optionActive : optionBtn}>
            <input type="radio" name="format" checked={format === 'encrypted'} onChange={() => setFormat('encrypted')} style={{ display: 'none' }} />
            <span style={optionLabel}>Encrypted (.json)</span>
            <span style={optionHint}>Recommended</span>
          </label>
          <label style={format === 'csv' ? optionActive : optionBtn}>
            <input type="radio" name="format" checked={format === 'csv'} onChange={() => setFormat('csv')} style={{ display: 'none' }} />
            <span style={optionLabel}>CSV (.csv)</span>
            <span style={optionHint}>Unencrypted</span>
          </label>
        </div>

        {format === 'csv' && (
          <div style={warningStyle}>⚠ CSV exports are unencrypted. Handle with care.</div>
        )}

        <Button variant="primary" size="lg" loading={loading} onClick={handleExport} style={{ width: '100%' }}>
          Export {items.length} items
        </Button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`, borderBottom: `1px solid ${tokens.colors.border}` };
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: tokens.colors.text, padding: 4 };
const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const contentStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg, padding: tokens.spacing.xxl, flex: 1, justifyContent: 'center' };
const descStyle: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.secondary, fontFamily: tokens.font.family, textAlign: 'center' };
const optionGroup: React.CSSProperties = { display: 'flex', gap: tokens.spacing.sm };
const optionBtn: React.CSSProperties = { flex: 1, padding: tokens.spacing.md, border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2, backgroundColor: 'transparent' };
const optionActive: React.CSSProperties = { ...optionBtn, borderColor: tokens.colors.primary, backgroundColor: 'rgba(37,99,235,0.05)' };
const optionLabel: React.CSSProperties = { fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.medium, color: tokens.colors.text, fontFamily: tokens.font.family };
const optionHint: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family };
const warningStyle: React.CSSProperties = { backgroundColor: '#fef3c7', padding: tokens.spacing.md, borderRadius: tokens.radius.md, fontSize: tokens.font.size.sm, color: '#92400e', fontFamily: tokens.font.family };
