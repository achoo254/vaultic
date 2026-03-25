// Background service worker — auto-lock alarm + message handling

const AUTO_LOCK_MINUTES = 15;
const LAST_ACTIVITY_KEY = 'last_activity_at';

export default defineBackground(() => {
  // Set up auto-lock check every minute
  browser.alarms.create('auto-lock-check', { periodInMinutes: 1 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'auto-lock-check') {
      await checkIdleAndLock();
    }
  });

  // Listen for activity pings from popup/content scripts
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'activity-ping') {
      chrome.storage.session.set({
        [LAST_ACTIVITY_KEY]: Date.now(),
      });
      sendResponse({ ok: true });
    }

    if (message.type === 'lock') {
      chrome.storage.session.remove('enc_key');
      sendResponse({ ok: true });
    }

    return true; // Keep message channel open for async
  });

  console.log('Vaultic background service worker started');
});

/** Check if user has been idle longer than AUTO_LOCK_MINUTES, then clear enc key. */
async function checkIdleAndLock() {
  const result = await chrome.storage.session.get([
    LAST_ACTIVITY_KEY,
    'enc_key',
  ]);

  // No encryption key = already locked
  if (!result.enc_key) return;

  const lastActivity = result[LAST_ACTIVITY_KEY] || 0;
  const idleMs = Date.now() - lastActivity;

  if (idleMs > AUTO_LOCK_MINUTES * 60 * 1000) {
    await chrome.storage.session.remove('enc_key');
    console.log('Auto-locked vault after idle timeout');
  }
}
