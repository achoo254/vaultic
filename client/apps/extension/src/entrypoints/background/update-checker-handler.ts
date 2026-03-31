// Background update checker — alarm-based polling for sideload extension updates
// Fires every 6h, fetches latest version from server, sets badge when update available

import {
  UPDATE_ALARM_NAME,
  UPDATE_CHECK_INTERVAL_MINUTES,
  isSideloadInstall,
  fetchLatestVersion,
  isNewerVersion,
  getUpdateState,
  setUpdateState,
} from '../../lib/update-checker';

/** Current extension version from manifest. */
function getCurrentVersion(): string {
  return chrome.runtime.getManifest().version;
}

/** Set or clear the badge indicator. */
function setBadge(hasUpdate: boolean): void {
  chrome.action.setBadgeText({ text: hasUpdate ? '!' : '' });
  if (hasUpdate) {
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  }
}

/** Handle the update check alarm: fetch, compare, update storage + badge. */
export async function handleUpdateAlarm(): Promise<void> {
  const latest = await fetchLatestVersion();
  if (!latest) return; // Server unreachable — silently retry next cycle

  const currentVersion = getCurrentVersion();
  const hasUpdate = isNewerVersion(currentVersion, latest.version);

  const existing = await getUpdateState();
  const dismissed = existing?.dismissed === true
    && existing?.dismissedVersion === latest.version;

  await setUpdateState({
    available: hasUpdate,
    info: hasUpdate ? latest : null,
    lastChecked: Date.now(),
    dismissed,
    dismissedVersion: existing?.dismissedVersion || null,
  });

  setBadge(hasUpdate && !dismissed);
}

/** Dismiss update banner for a specific version. */
export async function dismissUpdate(version: string): Promise<void> {
  const state = await getUpdateState();
  if (state) {
    state.dismissed = true;
    state.dismissedVersion = version;
    await setUpdateState(state);
    setBadge(false);
  }
}

/** Initialize update alarm — only for sideload installs. */
export async function initUpdateAlarm(): Promise<void> {
  const sideload = await isSideloadInstall();
  if (!sideload) return; // CWS install → Chrome handles auto-update

  chrome.alarms.create(UPDATE_ALARM_NAME, {
    periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES,
    delayInMinutes: 1, // First check 1 min after startup
  });

  // Restore badge from stored state
  const state = await getUpdateState();
  if (state?.available && !state.dismissed) {
    setBadge(true);
  }
}
