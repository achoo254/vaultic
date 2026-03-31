// Auto-lock vault after inactivity — replaces chrome.alarms for web app
// Uses setTimeout + user activity events + visibilitychange

let lockTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupFns: (() => void)[] = [];
const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes default

export function startAutoLock(onLock: () => void, timeoutMs = LOCK_TIMEOUT_MS) {
  stopAutoLock(); // Clear any existing timers

  const reset = () => resetTimer(onLock, timeoutMs);

  // Reset timer on user activity
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
  events.forEach((e) => document.addEventListener(e, reset, { passive: true }));

  // Shorter timeout when tab hidden, full timeout when visible
  const visHandler = () => {
    if (document.hidden) {
      resetTimer(onLock, Math.min(timeoutMs, 5 * 60 * 1000));
    } else {
      resetTimer(onLock, timeoutMs);
    }
  };
  document.addEventListener('visibilitychange', visHandler);

  // Store cleanup functions
  cleanupFns = [
    ...events.map((e) => () => document.removeEventListener(e, reset)),
    () => document.removeEventListener('visibilitychange', visHandler),
  ];

  resetTimer(onLock, timeoutMs);
}

export function stopAutoLock() {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = null;
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
}

function resetTimer(onLock: () => void, timeoutMs: number) {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(onLock, timeoutMs);
}
