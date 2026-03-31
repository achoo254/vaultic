// Web-specific authenticated fetch — uses httpOnly cookies for refresh token
import { createFetchWithAuth, type TokenProvider } from '@vaultic/api';
import { getAccessToken, storeAccessToken } from './web-storage';
import { API_BASE_URL } from './config';

// Web TokenProvider: access token from sessionStorage, refresh via httpOnly cookie
const webTokenProvider: TokenProvider = {
  async getTokens() {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;
    // refreshToken is in httpOnly cookie — not accessible from JS
    return { accessToken, refreshToken: '__cookie__' };
  },
  async storeTokens(accessToken: string) {
    await storeAccessToken(accessToken);
  },
};

/** Custom refresh function — calls /web/refresh with credentials: 'include' so the httpOnly cookie is sent */
async function webRefreshFn(apiBaseUrl: string): Promise<string | null> {
  const res = await fetch(`${apiBaseUrl}/api/v1/auth/web/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

/** Pre-configured fetchWithAuth for the web app (httpOnly cookie backed) */
export const fetchWithAuth = createFetchWithAuth(API_BASE_URL, webTokenProvider, {
  refreshFn: webRefreshFn,
});
