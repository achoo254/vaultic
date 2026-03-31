// Update checker — shared types, constants, and helpers for sideload auto-update

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  releasedAt: string;
}

export interface UpdateState {
  available: boolean;
  info: UpdateInfo | null;
  lastChecked: number;
  dismissed: boolean;
  dismissedVersion: string | null;
}

export const UPDATE_STORAGE_KEY = 'vaultic_update_state';
export const UPDATE_ALARM_NAME = 'check-extension-update';
export const UPDATE_CHECK_INTERVAL_MINUTES = 360; // 6 hours

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/** Check if extension was sideloaded (not from Chrome Web Store). */
export async function isSideloadInstall(): Promise<boolean> {
  try {
    const self = await chrome.management.getSelf();
    return self.installType !== 'normal';
  } catch {
    // If management API unavailable, assume sideload
    return true;
  }
}

/** Fetch latest version metadata from server. */
export async function fetchLatestVersion(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/extension/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.version || typeof data.version !== 'string') return null;
    if (!/^\d+\.\d+\.\d+/.test(data.version)) return null;
    if (!data.downloadUrl) return null;
    return {
      version: data.version,
      downloadUrl: data.downloadUrl,
      releaseNotes: data.releaseNotes || '',
      releasedAt: data.releasedAt || '',
    };
  } catch {
    return null;
  }
}

/** Simple semver compare: returns true if latest > current. */
export function isNewerVersion(current: string, latest: string): boolean {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

/** Read update state from chrome.storage.local. */
export async function getUpdateState(): Promise<UpdateState | null> {
  const result = await chrome.storage.local.get(UPDATE_STORAGE_KEY);
  return result[UPDATE_STORAGE_KEY] || null;
}

/** Save update state to chrome.storage.local. */
export async function setUpdateState(state: UpdateState): Promise<void> {
  await chrome.storage.local.set({ [UPDATE_STORAGE_KEY]: state });
}

/** Build full download URL — only allows same-origin or relative paths. */
export function resolveDownloadUrl(downloadUrl: string): string {
  if (downloadUrl.startsWith('http')) {
    try {
      const parsed = new URL(downloadUrl);
      const base = new URL(API_BASE_URL);
      if (parsed.origin !== base.origin) return ''; // reject cross-origin
    } catch {
      return '';
    }
    return downloadUrl;
  }
  return `${API_BASE_URL}${downloadUrl}`;
}
