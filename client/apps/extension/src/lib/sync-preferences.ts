// Push language/theme preferences to server when cloud sync is enabled
// Accepts optional overrides to avoid race condition with chrome.storage writes

import { fetchWithAuth } from './create-auth-fetch';

interface PreferenceOverrides {
  language?: string;
  theme?: string;
}

/** Push preferences to server. Overrides take precedence over stored values (avoids read-before-write race). */
export async function pushPreferencesToServer(overrides?: PreferenceOverrides): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(['sync_enabled', 'vaultic_language', 'vaultic_theme']);
    if (!stored.sync_enabled) return;

    const prefs = {
      language: overrides?.language || stored.vaultic_language || 'en',
      theme: overrides?.theme || stored.vaultic_theme || 'system',
      updatedAt: Date.now(),
    };

    await fetchWithAuth('/api/v1/sync/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });

    // Persist local timestamp for LWW comparison on pull
    await chrome.storage.local.set({ vaultic_prefs_updated_at: prefs.updatedAt });
  } catch {
    // Silent fail — preferences sync is best-effort
  }
}

/** Pull preferences from server and apply if newer than local. Returns true if updated. */
export async function pullPreferencesFromServer(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(['sync_enabled']);
    if (!stored.sync_enabled) return false;

    const res = await fetchWithAuth('/api/v1/sync/preferences');
    const data = await res.json();
    if (!data.preferences) return false;

    const { language, theme, updatedAt: serverTime } = data.preferences;

    // LWW: compare server timestamp with local
    const local = await chrome.storage.local.get(['vaultic_prefs_updated_at']);
    const localTime = local.vaultic_prefs_updated_at || 0;

    if (serverTime > localTime) {
      await chrome.storage.local.set({
        vaultic_language: language,
        vaultic_theme: theme,
        vaultic_prefs_updated_at: serverTime,
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
