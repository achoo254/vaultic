// Update guide page — 3-step instructions for sideload extension update

import React, { useEffect, useState } from 'react';
import { IconFolderOpen, IconReplace, IconRefresh, IconDownload } from '@tabler/icons-react';
import { tokens, ThemeProvider, useTheme } from '@vaultic/ui';
import type { UpdateState } from '../../lib/update-checker';
import { UPDATE_STORAGE_KEY, resolveDownloadUrl } from '../../lib/update-checker';

const steps = [
  {
    icon: IconFolderOpen,
    title: 'Extract',
    description: 'Unzip the downloaded file to a folder on your computer.',
  },
  {
    icon: IconReplace,
    title: 'Replace',
    description:
      'Open chrome://extensions → find Vaultic → click "Load unpacked" → select the extracted folder (replace the old one).',
  },
  {
    icon: IconRefresh,
    title: 'Reload',
    description: 'Click the reload button (↻) on the Vaultic extension card in chrome://extensions.',
  },
];

function GuideContent() {
  const { colors } = useTheme();
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  useEffect(() => {
    chrome.storage.local.get(UPDATE_STORAGE_KEY, (result) => {
      if (result[UPDATE_STORAGE_KEY]) setUpdateState(result[UPDATE_STORAGE_KEY]);
    });
  }, []);

  const handleDownload = () => {
    if (!updateState?.info) return;
    const url = resolveDownloadUrl(updateState.info.downloadUrl);
    if (!url) return;
    chrome.downloads.download({ url }, () => {
      if (chrome.runtime.lastError) console.error('Download failed:', chrome.runtime.lastError);
    });
  };

  const pageStyle: React.CSSProperties = {
    maxWidth: '560px',
    margin: '0 auto',
    padding: `${tokens.spacing['2xl']} ${tokens.spacing.lg}`,
    fontFamily: tokens.font.family,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: '100vh',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: tokens.spacing['2xl'],
  };

  const versionBadge: React.CSSProperties = {
    display: 'inline-block',
    padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
    backgroundColor: colors.primaryBg,
    color: colors.primary,
    borderRadius: tokens.radius.full,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.medium,
    marginBottom: tokens.spacing.md,
  };

  const stepContainer: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
    marginBottom: tokens.spacing['2xl'],
  };

  const stepStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.lg,
    border: `1px solid ${colors.border}`,
  };

  const iconWrap: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: tokens.radius.md,
    backgroundColor: colors.primaryBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    width: '100%',
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: tokens.radius.md,
    fontSize: tokens.font.size.base,
    fontWeight: tokens.font.weight.medium,
    cursor: 'pointer',
    fontFamily: tokens.font.family,
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        {updateState?.info && (
          <div style={versionBadge}>v{updateState.info.version}</div>
        )}
        <h1 style={{ fontSize: tokens.font.size['2xl'], fontWeight: tokens.font.weight.bold, margin: 0 }}>
          Update Vaultic Extension
        </h1>
        {updateState?.info?.releaseNotes && (
          <p style={{ color: colors.secondary, fontSize: tokens.font.size.sm, marginTop: tokens.spacing.sm }}>
            {updateState.info.releaseNotes}
          </p>
        )}
      </div>

      <div style={stepContainer}>
        {steps.map((step, i) => (
          <div key={step.title} style={stepStyle}>
            <div style={iconWrap}>
              <step.icon size={20} stroke={1.5} color={colors.primary} />
            </div>
            <div>
              <div style={{ fontWeight: tokens.font.weight.semibold, marginBottom: '4px' }}>
                Step {i + 1}: {step.title}
              </div>
              <div style={{ color: colors.secondary, fontSize: tokens.font.size.sm, lineHeight: '1.5' }}>
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {updateState?.info && (
        <button style={btnStyle} onClick={handleDownload}>
          <IconDownload size={18} stroke={1.5} />
          Download Again
        </button>
      )}
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <GuideContent />
    </ThemeProvider>
  );
}
