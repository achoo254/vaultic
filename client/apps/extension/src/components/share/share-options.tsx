// Reusable TTL + max views pill selectors for share configuration
import React from 'react';
import { VStack, SectionHeader, PillGroup, tokens, useTheme } from '@vaultic/ui';
import { AlertTriangle } from 'lucide-react';

interface ShareOptionsProps {
  ttlHours: number | null;
  maxViews: number | null;
  onTtlChange: (hours: number | null) => void;
  onMaxViewsChange: (views: number | null) => void;
}

const TTL_OPTIONS = [
  { label: '1 hour', value: 1 as number | null },
  { label: '24 hours', value: 24 as number | null },
  { label: '7 days', value: 168 as number | null },
  { label: 'No limit', value: null as number | null },
];

const VIEW_OPTIONS = [
  { label: '1', value: 1 as number | null },
  { label: '3', value: 3 as number | null },
  { label: '5', value: 5 as number | null },
  { label: '10', value: 10 as number | null },
  { label: 'No limit', value: null as number | null },
];

export function ShareOptions({ ttlHours, maxViews, onTtlChange, onMaxViewsChange }: ShareOptionsProps) {
  const { colors } = useTheme();

  const warningStyle: React.CSSProperties = {
    fontSize: tokens.font.size.xs, color: colors.warning, fontFamily: tokens.font.family,
    display: 'flex', alignItems: 'center', gap: 4,
  };

  return (
    <VStack gap="md">
      <VStack gap="xs">
        <SectionHeader style={{ textTransform: 'none', fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, color: colors.text }}>
          Expires after
        </SectionHeader>
        <PillGroup options={TTL_OPTIONS} value={ttlHours} onChange={onTtlChange} />
      </VStack>

      <VStack gap="xs">
        <SectionHeader style={{ textTransform: 'none', fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium, color: colors.text }}>
          Max views
        </SectionHeader>
        <PillGroup options={VIEW_OPTIONS} value={maxViews} onChange={onMaxViewsChange} />
      </VStack>

      {ttlHours === null && maxViews === null && (
        <div style={warningStyle}>
          <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} /> This link will remain active until manually revoked
        </div>
      )}
    </VStack>
  );
}
