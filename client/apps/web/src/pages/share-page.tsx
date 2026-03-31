// Share page — create encrypted share links
import React, { useState } from 'react';
import { Button, Input, Card, tokens, useTheme } from '@vaultic/ui';
import { IconArrowLeft, IconLink, IconCopy } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

export function SharePage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [shareText, setShareText] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareText.trim()) return;
    setLoading(true);
    try {
      // Placeholder — full share integration requires share-crypto module
      setShareUrl(`Share feature will be fully wired in next iteration`);
    } catch {
      setShareUrl('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
    padding: `${tokens.spacing.lg}px 0`,
  };

  return (
    <div>
      <div style={headerStyle}>
        <button onClick={() => navigate('/vault')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <IconArrowLeft size={20} stroke={1.5} color={colors.text} />
        </button>
        <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: colors.text, fontFamily: tokens.font.family }}>
          Secure Share
        </div>
      </div>

      <p style={{ fontSize: tokens.font.size.sm, color: colors.secondary, fontFamily: tokens.font.family, lineHeight: 1.5, marginBottom: tokens.spacing.lg }}>
        Create an encrypted link to share credentials securely. The encryption key stays in the URL fragment — the server never sees your data.
      </p>

      <form onSubmit={handleCreateShare} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        <Input
          label="Text to share"
          value={shareText}
          onChange={(e) => setShareText(e.target.value)}
          placeholder="Enter text or password to share"
          required
        />
        <Button type="submit" variant="primary" size="md" loading={loading} style={{ width: '100%' }}>
          <IconLink size={16} stroke={1.5} /> Create Share Link
        </Button>
      </form>

      {shareUrl && (
        <Card style={{ padding: tokens.spacing.md, marginTop: tokens.spacing.lg }}>
          <div style={{ fontSize: tokens.font.size.sm, color: colors.text, fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: tokens.spacing.sm }}>
            {shareUrl}
          </div>
          <Button variant="secondary" size="sm" onClick={copyUrl}>
            <IconCopy size={14} stroke={1.5} /> {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </Card>
      )}
    </div>
  );
}
