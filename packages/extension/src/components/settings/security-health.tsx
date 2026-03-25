// Screen 10: Security Health — password strength analysis
import React from 'react';
import { tokens } from '@vaultic/ui';
import { useVaultStore } from '../../stores/vault-store';

interface SecurityHealthProps { onBack: () => void; }

export function SecurityHealth({ onBack }: SecurityHealthProps) {
  const items = useVaultStore((s) => s.items);

  // Analyze passwords
  const passwords = items.map((i) => i.credential.password).filter(Boolean);
  const total = passwords.length;
  const weak = passwords.filter((p) => (p?.length || 0) < 10).length;
  const reused = total - new Set(passwords).size;
  const strong = total - weak;
  const score = total > 0 ? Math.round(((total - weak - reused) / total) * 100) : 100;

  const scoreColor = score >= 80 ? tokens.colors.success : score >= 50 ? tokens.colors.warning : tokens.colors.error;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={titleStyle}>Security Health</span>
      </div>

      <div style={contentStyle}>
        {/* Score circle */}
        <div style={scoreSection}>
          <div style={{ ...scoreCircle, borderColor: scoreColor }}>
            <span style={{ ...scoreNumber, color: scoreColor }}>{score}%</span>
          </div>
          <div style={scoreLabelStyle}>
            {score >= 80 ? 'Strong' : score >= 50 ? 'Fair' : 'Weak'}
          </div>
        </div>

        {/* Issue categories */}
        <div style={categoriesStyle}>
          <CategoryRow icon="🔴" label="Weak passwords" count={weak} color={tokens.colors.error} />
          <CategoryRow icon="🟡" label="Reused passwords" count={reused} color={tokens.colors.warning} />
          <CategoryRow icon="🟢" label="Strong passwords" count={strong} color={tokens.colors.success} />
        </div>

        {/* Summary */}
        <div style={summaryStyle}>
          <SummaryItem label="Total" value={total} />
          <SummaryItem label="Strong" value={strong} />
          <SummaryItem label="Weak" value={weak} />
          <SummaryItem label="Reused" value={reused} />
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <div style={catRowStyle}>
      <span>{icon}</span>
      <span style={catLabel}>{label}</span>
      <span style={{ ...catCount, color }}>{count}</span>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={summaryItem}>
      <div style={summaryValue}>{value}</div>
      <div style={summaryLabel}>{label}</div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`, borderBottom: `1px solid ${tokens.colors.border}` };
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: tokens.colors.text, padding: 4 };
const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const contentStyle: React.CSSProperties = { flex: 1, padding: tokens.spacing.xxl, display: 'flex', flexDirection: 'column', gap: tokens.spacing.xxl };
const scoreSection: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacing.sm };
const scoreCircle: React.CSSProperties = { width: 100, height: 100, borderRadius: '50%', border: '4px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const scoreNumber: React.CSSProperties = { fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold, fontFamily: tokens.font.family };
const scoreLabelStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.medium, color: tokens.colors.text, fontFamily: tokens.font.family };
const categoriesStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.md };
const catRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.md, padding: `${tokens.spacing.sm}px 0` };
const catLabel: React.CSSProperties = { flex: 1, fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family };
const catCount: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, fontFamily: tokens.font.family };
const summaryStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-around', backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.md, padding: tokens.spacing.lg };
const summaryItem: React.CSSProperties = { textAlign: 'center' };
const summaryValue: React.CSSProperties = { fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold, color: tokens.colors.text, fontFamily: tokens.font.family };
const summaryLabel: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family };
