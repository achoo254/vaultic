// Auto-lock vault when system goes idle or locks

const DEFAULT_AUTO_LOCK_MINUTES = 15;

/** Initialize auto-lock using chrome.idle API — tracks system-wide idle state. */
export async function initAutoLock() {
  const settings = await chrome.storage.local.get('auto_lock_min');
  const minutes = settings.auto_lock_min || DEFAULT_AUTO_LOCK_MINUTES;
  chrome.idle.setDetectionInterval(minutes * 60);

  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'locked' || state === 'idle') {
      const result = await chrome.storage.session.get('enc_key');
      if (result.enc_key) {
        await chrome.storage.session.remove('enc_key');
        console.log(`Auto-locked vault (system ${state})`);
      }
    }
  });
}

/** Re-apply idle interval when user changes setting. */
export function listenAutoLockChanges() {
  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.auto_lock_min) {
      const minutes = changes.auto_lock_min.newValue || DEFAULT_AUTO_LOCK_MINUTES;
      chrome.idle.setDetectionInterval(minutes * 60);
    }
  });
}
