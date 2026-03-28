// Copy to clipboard with auto-clear via background alarm (survives popup close)
import React, { useState } from 'react';
import { tokens, useTheme } from '@vaultic/ui';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  size?: number;
}

export function CopyButton({ text, size = 16 }: CopyButtonProps) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Schedule clipboard clear in background (survives popup close)
    chrome.runtime?.sendMessage?.({ type: 'schedule-clipboard-clear' }).catch(() => {});
  };

  const btnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: 4,
    color: colors.secondary,
  };

  return (
    <button onClick={handleCopy} style={btnStyle} title="Copy">
      {copied ? <Check size={size} strokeWidth={1.5} /> : <Copy size={size} strokeWidth={1.5} />}
    </button>
  );
}
