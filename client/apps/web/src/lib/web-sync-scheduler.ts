// Periodic sync scheduler for web — replaces chrome.alarms
// Syncs on interval while tab open + on tab regain focus

let syncInterval: ReturnType<typeof setInterval> | null = null;
let visHandler: (() => void) | null = null;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startSyncScheduler(doSync: () => Promise<void>, intervalMs = SYNC_INTERVAL_MS) {
  stopSyncScheduler();

  // Periodic sync while tab open
  syncInterval = setInterval(() => {
    if (!document.hidden) doSync().catch(console.error);
  }, intervalMs);

  // Sync when tab regains focus
  visHandler = () => {
    if (!document.hidden) doSync().catch(console.error);
  };
  document.addEventListener('visibilitychange', visHandler);
}

export function stopSyncScheduler() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = null;
  if (visHandler) document.removeEventListener('visibilitychange', visHandler);
  visHandler = null;
}
