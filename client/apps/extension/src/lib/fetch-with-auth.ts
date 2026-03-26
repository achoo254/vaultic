// Authenticated fetch with automatic JWT token refresh on 401
// Retries once after refreshing the access token

import { getTokens, storeTokens } from './session-storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/** Fetch with JWT auth, auto-refresh on 401. Throws with server error message. */
export async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const tokens = await getTokens();
  if (!tokens?.accessToken) throw new Error('Not authenticated');

  const doFetch = (accessToken: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await doFetch(tokens.accessToken);

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && tokens.refreshToken) {
    const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      await storeTokens(data.access_token, tokens.refreshToken);
      res = await doFetch(data.access_token);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  return res;
}
