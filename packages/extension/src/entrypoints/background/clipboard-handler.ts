// Clipboard clear scheduling via alarms

/** Schedule clipboard clear via alarm — survives popup close. */
export async function scheduleClipboardClear() {
  const settings = await chrome.storage.local.get('clipboard_clear_sec');
  const seconds = settings.clipboard_clear_sec ?? 30;
  if (seconds === 0) return { ok: true }; // "Never" — skip

  await browser.alarms.create('clear-clipboard', {
    delayInMinutes: Math.max(seconds / 60, 0.5),
  });
  return { ok: true };
}

/** Clear clipboard by sending message to active tab's content script. */
export async function clearClipboardViaTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_CLIPBOARD' }).catch(() => {});
    }
  } catch {
    // No active tab — clipboard already protected by session end
  }
}
