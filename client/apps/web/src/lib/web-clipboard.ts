// Auto-clear clipboard after copying sensitive data (passwords)
const CLIPBOARD_CLEAR_MS = 30 * 1000; // 30 seconds

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/** Copy text to clipboard and auto-clear after timeout */
export async function copyAndAutoClear(text: string, timeoutMs = CLIPBOARD_CLEAR_MS) {
  await navigator.clipboard.writeText(text);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) await navigator.clipboard.writeText('');
    } catch {
      // Clipboard read may fail if tab not focused — ignore
    }
  }, timeoutMs);
}
