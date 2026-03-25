// Copy to clipboard with auto-clear via background alarm (survives popup close)
import React, { useState } from 'react';
import { tokens } from '@vaultic/ui';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = '📋' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Schedule clipboard clear in background (survives popup close)
    chrome.runtime?.sendMessage?.({ type: 'schedule-clipboard-clear' }).catch(() => {});
  };

  return (
    <button onClick={handleCopy} style={btnStyle} title="Copy">
      {copied ? '✓' : label}
    </button>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 4,
  color: tokens.colors.secondary,
};
