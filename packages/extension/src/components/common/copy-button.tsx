// Copy to clipboard with auto-clear after 30s
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
    // Auto-clear clipboard after 30s
    setTimeout(() => navigator.clipboard.writeText(''), 30000);
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
