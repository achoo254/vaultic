// Reusable TTL + max views pill selectors for share configuration
import React from 'react';
import { tokens } from '@vaultic/ui';

interface ShareOptionsProps {
  ttlHours: number | null;
  maxViews: number | null;
  onTtlChange: (hours: number | null) => void;
  onMaxViewsChange: (views: number | null) => void;
}

const TTL_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: 'No limit', value: null },
];

const VIEW_OPTIONS = [
  { label: '1', value: 1 },
  { label: '3', value: 3 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: 'No limit', value: null },
];

export function ShareOptions({ ttlHours, maxViews, onTtlChange, onMaxViewsChange }: ShareOptionsProps) {
  return (
    <div style={containerStyle}>
      <div style={sectionStyle}>
        <div style={labelStyle}>Expires after</div>
        <div style={pillRow}>
          {TTL_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onTtlChange(opt.value)}
              style={ttlHours === opt.value ? activePill : pill}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Max views</div>
        <div style={pillRow}>
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onMaxViewsChange(opt.value)}
              style={maxViews === opt.value ? activePill : pill}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {ttlHours === null && maxViews === null && (
        <div style={warningStyle}>⚠ This link will remain active until manually revoked</div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.md };
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs };
const labelStyle: React.CSSProperties = { fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, color: tokens.colors.text, fontFamily: tokens.font.family };
const pillRow: React.CSSProperties = { display: 'flex', gap: tokens.spacing.xs, flexWrap: 'wrap' };
const pill: React.CSSProperties = {
  padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`, borderRadius: tokens.radius.full,
  border: `1px solid ${tokens.colors.border}`, backgroundColor: 'transparent',
  color: tokens.colors.text, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family, cursor: 'pointer',
};
const activePill: React.CSSProperties = {
  ...pill, backgroundColor: tokens.colors.primary, color: '#fff', borderColor: tokens.colors.primary,
};
const warningStyle: React.CSSProperties = {
  fontSize: tokens.font.size.xs, color: tokens.colors.warning, fontFamily: tokens.font.family,
};
