// Background sync alarm — periodic sync via chrome.alarms with exponential backoff
// Fires every 3 min (base), backs off to 30 min max on consecutive failures

import { createSyncEngine } from '../../lib/create-sync-engine';
import { getVaultConfig } from '../../lib/session-storage';

const ALARM_NAME = 'vaultic-sync';
const BASE_INTERVAL = 3; // minutes
const MAX_INTERVAL = 30; // minutes
let consecutiveFailures = 0;

/** Get current userId from VaultConfig (works in service worker context). */
async function getCurrentUserId(): Promise<string | null> {
  const config = await getVaultConfig();
  if (!config) return null;
  return config.mode === 'online' && config.userId ? config.userId : 'local';
}

/** Register sync alarm if sync is enabled. Called on SW startup. */
export async function initSyncAlarm(): Promise<void> {
  const { sync_enabled } = await chrome.storage.local.get('sync_enabled');
  if (sync_enabled) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: BASE_INTERVAL });
    consecutiveFailures = 0;
  }
}

/** Execute sync on alarm fire. Skips if offline, locked, or no userId. */
export async function handleSyncAlarm(): Promise<void> {
  if (!navigator.onLine) return;

  const { sync_enabled } = await chrome.storage.local.get('sync_enabled');
  if (!sync_enabled) return;

  // Skip sync when vault is locked (no encryption key = expired JWT likely)
  const session = await chrome.storage.session.get('enc_key');
  if (!session.enc_key) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const engine = createSyncEngine(userId);
    await engine.sync();
    // Reset backoff on success
    if (consecutiveFailures > 0) {
      consecutiveFailures = 0;
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: BASE_INTERVAL });
    }
  } catch (err) {
    console.error('[SyncAlarm] sync failed:', err);
    consecutiveFailures++;
    // Exponential backoff: 3 → 6 → 12 → 24 → 30 (capped)
    const nextInterval = Math.min(BASE_INTERVAL * Math.pow(2, consecutiveFailures), MAX_INTERVAL);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: nextInterval });
  }
}

/** Watch sync_enabled toggle to start/stop alarm. */
export function listenSyncSettingsChanges(): void {
  chrome.storage.local.onChanged.addListener((changes) => {
    if ('sync_enabled' in changes) {
      if (changes.sync_enabled.newValue) {
        chrome.alarms.create(ALARM_NAME, { periodInMinutes: BASE_INTERVAL });
        consecutiveFailures = 0;
      } else {
        chrome.alarms.clear(ALARM_NAME);
      }
    }
  });
}
