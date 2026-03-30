// Screen 10: Security Health — password strength analysis with score circle and issue cards
import React from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { IconArrowLeft, IconShieldExclamation, IconCopy, IconClock, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../stores/vault-store';

interface SecurityHealthProps { onBack: () => void; }

export function SecurityHealth({ onBack }: SecurityHealthProps) {
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common']);
  const items = useVaultStore((s) => s.items);

  // Analyze passwords
  const passwords = items.map((i) => i.credential.password).filter(Boolean);
  const total = passwords.length;
  const weak = passwords.filter((p) => (p?.length || 0) < 10).length;
  const reused = total - new Set(passwords).size;
  const strong = total - weak;
  const score = total > 0 ? Math.round(((total - weak - reused) / total) * 100) : 100;
  const scoreColor = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
        height: 52, padding: `0 ${tokens.spacing.lg}px`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4, display: 'flex' }}>
          <IconArrowLeft size={20} stroke={1.5} />
        </button>
        <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>
          {t('settings:health.title')}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: `${tokens.spacing.md}px ${tokens.spacing.xxl}px`, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {/* Score circle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <svg width={80} height={80} viewBox="0 0 80 80">
            <circle cx={40} cy={40} r={33} fill="none" stroke={colors.border} strokeWidth={6} />
            <circle cx={40} cy={40} r={33} fill="none" stroke={scoreColor} strokeWidth={6}
              strokeDasharray={2 * Math.PI * 33} strokeDashoffset={2 * Math.PI * 33 * (1 - score / 100)}
              strokeLinecap="round" transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            <text x={40} y={40} textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: 22, fontWeight: 700, fontFamily: tokens.font.family, fill: colors.text }}>
              {score}%
            </text>
          </svg>
          <span style={{ fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, color: colors.secondary, fontFamily: tokens.font.family }}>
            {t('settings:health.overallScore')}
          </span>
        </div>

        {/* Issue cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <IssueCard
            icon={<ShieldAlert size={20} strokeWidth={1.5} color={colors.error} />}
            label={t('settings:health.weakPasswords')}
            desc={t('settings:health.weakDesc', { count: weak })}
            count={weak} countColor={colors.error}
            bg="#FEF2F2" borderColor="#FECACA" darkBg="#450A0A" darkBorder="#7F1D1D"
          />
          <IssueCard
            icon={<Copy size={20} strokeWidth={1.5} color={colors.warning} />}
            label={t('settings:health.reusedPasswords')}
            desc={t('settings:health.reusedDesc', { count: reused })}
            count={reused} countColor={colors.warning}
            bg="#FFFBEB" borderColor="#FDE68A" darkBg="#422006" darkBorder="#78350F"
          />
          <IssueCard
            icon={<Timer size={20} strokeWidth={1.5} color="#0EA5E9" />}
            label={t('settings:health.oldPasswords')}
            desc={t('settings:health.oldDesc')}
            count={0} countColor="#0EA5E9"
            bg="#F0F9FF" borderColor="#BAE6FD" darkBg="#0C4A6E" darkBorder="#075985"
          />
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: `${tokens.spacing.md}px 0`,
          borderTop: `1px solid ${colors.border}`,
        }}>
          <SummaryItem label={t('settings:health.total')} value={total} color={colors.text} />
          <SummaryItem label={t('settings:health.strong')} value={strong} color={colors.success} />
          <SummaryItem label={t('settings:health.medium')} value={total - strong - weak} color={colors.warning} />
          <SummaryItem label={t('settings:health.weak')} value={weak} color={colors.error} />
        </div>
      </div>
    </div>
  );
}

function IssueCard({ icon, label, desc, count, countColor, bg, borderColor, darkBg, darkBorder }: {
  icon: React.ReactNode; label: string; desc: string; count: number; countColor: string;
  bg: string; borderColor: string; darkBg: string; darkBorder: string;
}) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, height: 52,
      padding: `0 14px`, borderRadius: 10,
      backgroundColor: isDark ? darkBg : bg,
      border: `1px solid ${isDark ? darkBorder : borderColor}`,
    }}>
      {icon}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: tokens.font.size.base, fontWeight: tokens.font.weight.semibold, color: colors.text, fontFamily: tokens.font.family }}>{label}</span>
        <span style={{ fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family }}>{desc}</span>
      </div>
      <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: countColor, fontFamily: tokens.font.family }}>{count}</span>
      <ChevronRight size={16} strokeWidth={1.5} color={colors.secondary} />
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold, color, fontFamily: tokens.font.family }}>{value}</div>
      <div style={{ fontSize: tokens.font.size.xs, color: colors.secondary, fontFamily: tokens.font.family }}>{label}</div>
    </div>
  );
}
