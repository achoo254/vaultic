// Toast notification component — success/error messages
import React, { useEffect, useState, useCallback } from 'react';
import { tokens, useTheme } from '@vaultic/ui';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let addToastFn: ((message: string, type: Toast['type']) => void) | null = null;

/** Show a toast notification from anywhere. */
export function showToast(message: string, type: Toast['type'] = 'info') {
  addToastFn?.(message, type);
}

/** Toast container — mount once at app root. */
export function ToastContainer() {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => { addToastFn = addToast; return () => { addToastFn = null; }; }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map((t) => (
        <div key={t.id} style={{ ...toastStyle, backgroundColor: t.type === 'error' ? colors.error : t.type === 'success' ? colors.success : colors.surface }}>
          <span>{t.type === 'success' ? '\u2713' : t.type === 'error' ? '\u2715' : '\u2139'}</span>
          <span style={msgStyle}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed', bottom: 60, left: tokens.spacing.md, right: tokens.spacing.md,
  display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs, zIndex: 100,
};
const toastStyle: React.CSSProperties = {
  padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`, borderRadius: tokens.radius.md,
  color: tokens.colors.onPrimary, display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
  fontSize: tokens.font.size.sm, fontFamily: tokens.font.family,
  animation: 'fadeIn 0.2s ease',
};
const msgStyle: React.CSSProperties = { flex: 1 };
