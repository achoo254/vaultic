// Screen 24: Import Passwords — support Chrome CSV, 1Password, Bitwarden
import React, { useState, useRef } from 'react';
import { Button } from '@vaultic/ui';
import { tokens } from '@vaultic/ui';
import { useVaultStore } from '../../stores/vault-store';
import type { LoginCredential } from '@vaultic/types';

interface ImportPasswordsProps { onBack: () => void; }

const SOURCES = [
  { id: 'chrome', label: 'Google Chrome', ext: '.csv' },
  { id: 'bitwarden', label: 'Bitwarden', ext: '.csv,.json' },
  { id: '1password', label: '1Password', ext: '.csv,.1pux' },
  { id: 'csv', label: 'CSV File', ext: '.csv' },
];

export function ImportPasswords({ onBack }: ImportPasswordsProps) {
  const [source, setSource] = useState('chrome');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addItem = useVaultStore((s) => s.addItem);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const items = parseCSV(text);
      for (const item of items) {
        await addItem(item);
      }
      setResult(`Successfully imported ${items.length} credentials`);
    } catch (err) {
      setResult(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={titleStyle}>Import Passwords</span>
      </div>
      <div style={contentStyle}>
        <div style={{ fontSize: 36, textAlign: 'center' }}>📤</div>
        <div style={descStyle}>Import passwords from another manager</div>

        <div style={sourceGrid}>
          {SOURCES.map((s) => (
            <button key={s.id} onClick={() => setSource(s.id)} style={source === s.id ? sourceActive : sourceBtn}>
              {s.label}
            </button>
          ))}
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={uploadArea}
        >
          <input ref={fileRef} type="file" accept={SOURCES.find((s) => s.id === source)?.ext} onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          {file ? <span>{file.name}</span> : <span>Tap to select file</span>}
        </div>

        {result && <div style={resultStyle}>{result}</div>}

        <Button variant="primary" size="lg" loading={loading} disabled={!file} onClick={handleImport} style={{ width: '100%' }}>
          Import
        </Button>
      </div>
    </div>
  );
}

/** Parse a standard password CSV (name, url, username, password). */
function parseCSV(text: string): LoginCredential[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  // Detect column indices from header
  const cols = header.split(',').map((c) => c.trim().replace(/"/g, ''));
  const nameIdx = cols.findIndex((c) => /name|title/.test(c));
  const urlIdx = cols.findIndex((c) => /url|website|login_uri/.test(c));
  const userIdx = cols.findIndex((c) => /user|email|login_username/.test(c));
  const passIdx = cols.findIndex((c) => /pass|password|login_password/.test(c));
  const notesIdx = cols.findIndex((c) => /note/.test(c));

  return lines.slice(1).map((line) => {
    const fields = parseCSVLine(line);
    return {
      name: fields[nameIdx] || fields[0] || 'Imported',
      url: fields[urlIdx] || fields[1],
      username: fields[userIdx] || fields[2] || '',
      password: fields[passIdx] || fields[3] || '',
      notes: fields[notesIdx],
    };
  }).filter((i) => i.password); // Only import items with passwords
}

/** Parse a single CSV line respecting quoted fields. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`, borderBottom: `1px solid ${tokens.colors.border}` };
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: tokens.colors.text, padding: 4 };
const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const contentStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg, padding: tokens.spacing.xxl, flex: 1 };
const descStyle: React.CSSProperties = { fontSize: tokens.font.size.base, color: tokens.colors.secondary, fontFamily: tokens.font.family, textAlign: 'center' };
const sourceGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.sm };
const sourceBtn: React.CSSProperties = { padding: tokens.spacing.md, border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md, cursor: 'pointer', fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, color: tokens.colors.text, backgroundColor: 'transparent', textAlign: 'center' };
const sourceActive: React.CSSProperties = { ...sourceBtn, borderColor: tokens.colors.primary, backgroundColor: 'rgba(37,99,235,0.05)', fontWeight: tokens.font.weight.medium };
const uploadArea: React.CSSProperties = { border: `2px dashed ${tokens.colors.border}`, borderRadius: tokens.radius.md, padding: tokens.spacing.xxl, textAlign: 'center', cursor: 'pointer', fontSize: tokens.font.size.base, color: tokens.colors.secondary, fontFamily: tokens.font.family };
const resultStyle: React.CSSProperties = { fontSize: tokens.font.size.sm, color: tokens.colors.success, fontFamily: tokens.font.family, textAlign: 'center' };
