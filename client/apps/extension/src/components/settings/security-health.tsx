// Screen 10: Security Health — password strength analysis with SVG donut chart
import React from 'react';
import { tokens, HStack, Card } from '@vaultic/ui';
import { ArrowLeft, ShieldAlert, RefreshCw, ShieldCheck } from 'lucide-react';
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
        <button onClick={onBack} style={backBtn}><ArrowLeft size={18} strokeWidth={1.5} /></button>
        <span style={titleStyle}>Security Health</span>
      </div>

      <div style={contentStyle}>
        {/* SVG Donut chart */}
        <div style={scoreSection}>
          <DonutChart score={score} color={scoreColor} />
          <div style={scoreLabelStyle}>
            {score >= 80 ? 'Strong' : score >= 50 ? 'Fair' : 'Weak'}
          </div>
        </div>

        {/* Issue categories with Lucide icons */}
        <div style={categoriesStyle}>
          <CategoryRow icon={<ShieldAlert size={18} strokeWidth={1.5} color={tokens.colors.error} />} label="Weak passwords" count={weak} color={tokens.colors.error} />
          <CategoryRow icon={<RefreshCw size={18} strokeWidth={1.5} color={tokens.colors.warning} />} label="Reused passwords" count={reused} color={tokens.colors.warning} />
          <CategoryRow icon={<ShieldCheck size={18} strokeWidth={1.5} color={tokens.colors.success} />} label="Strong passwords" count={strong} color={tokens.colors.success} />
        </div>

        {/* Summary */}
        <Card variant="filled" padding="lg">
          <HStack justify="space-around">
            <SummaryItem label="Total" value={total} />
            <SummaryItem label="Strong" value={strong} />
            <SummaryItem label="Weak" value={weak} />
            <SummaryItem label="Reused" value={reused} />
          </HStack>
        </Card>
      </div>
    </div>
  );
}

/** SVG donut/ring chart showing score percentage */
function DonutChart({ score, color }: { score: number; color: string }) {
  const radius = 44;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      {/* Background ring */}
      <circle cx={55} cy={55} r={radius} fill="none" stroke={tokens.colors.border} strokeWidth={strokeWidth} />
      {/* Score ring */}
      <circle
        cx={55} cy={55} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {/* Score text */}
      <text x={55} y={55} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 24, fontWeight: 700, fontFamily: tokens.font.family, fill: color }}>
        {score}%
      </text>
    </svg>
  );
}

function CategoryRow({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div style={catRowStyle}>
      <div style={{ ...catIconBg, backgroundColor: `${color}15`, color }}>{icon}</div>
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
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: tokens.colors.text, padding: 4, display: 'flex', alignItems: 'center' };
const titleStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, fontFamily: tokens.font.family };
const contentStyle: React.CSSProperties = { flex: 1, padding: tokens.spacing.xxl, display: 'flex', flexDirection: 'column', gap: tokens.spacing.xxl };
const scoreSection: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacing.sm };
const scoreLabelStyle: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.medium, color: tokens.colors.text, fontFamily: tokens.font.family };
const categoriesStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.md };
const catRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: tokens.spacing.md, padding: `${tokens.spacing.sm}px 0` };
const catIconBg: React.CSSProperties = { width: 32, height: 32, borderRadius: tokens.radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const catLabel: React.CSSProperties = { flex: 1, fontSize: tokens.font.size.base, color: tokens.colors.text, fontFamily: tokens.font.family };
const catCount: React.CSSProperties = { fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, fontFamily: tokens.font.family };
const summaryItem: React.CSSProperties = { textAlign: 'center' };
const summaryValue: React.CSSProperties = { fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold, color: tokens.colors.text, fontFamily: tokens.font.family };
const summaryLabel: React.CSSProperties = { fontSize: tokens.font.size.xs, color: tokens.colors.secondary, fontFamily: tokens.font.family };
