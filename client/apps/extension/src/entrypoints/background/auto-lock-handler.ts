// Auto-lock vault after N minutes since last popup interaction
// Uses chrome.alarms (survives service worker termination)

const ALARM_NAME = 'auto-lock-check';
const DEFAULT_AUTO_LOCK_MINUTES = 15;

/** Initialize auto-lock — check every minute if vault should lock. */
export async function initAutoLock() {
  // Also lock on system lock (immediate, regardless of timer)
  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'locked') {
      const result = await chrome.storage.session.get('enc_key');
      if (result.enc_key) {
        await chrome.storage.session.remove('enc_key');
        console.log('Auto-locked vault (system locked)');
      }
    }
  });

  // Start periodic alarm to check inactivity
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}

/** Called every minute by alarm — check if vault should auto-lock. */
export async function checkAutoLock() {
  const result = await chrome.storage.session.get('enc_key');
  if (!result.enc_key) return; // Already locked

  const data = await chrome.storage.local.get(['auto_lock_min', 'last_active_at']);
  const minutes = data.auto_lock_min || DEFAULT_AUTO_LOCK_MINUTES;
  const lastActive = data.last_active_at || 0;

  const elapsed = (Date.now() - lastActive) / 60_000;
  if (elapsed >= minutes) {
    await chrome.storage.session.remove('enc_key');
    console.log(`Auto-locked vault (inactive ${Math.round(elapsed)} min, limit ${minutes} min)`);
  }
}

/** Record user activity — call when popup opens or user interacts. */
export async function recordActivity() {
  await chrome.storage.local.set({ last_active_at: Date.now() });
}

/** Re-apply when user changes auto-lock setting. */
export function listenAutoLockChanges() {
  // No interval to update — alarm runs every minute regardless
  // Setting change takes effect on next check cycle
}
