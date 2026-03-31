// Generic authenticated fetch with JWT auto-refresh on 401
// Platform-agnostic: uses TokenProvider interface for extension/web portability

/** Interface for platform-specific token storage */
export interface TokenProvider {
  getTokens(): Promise<{ accessToken: string; refreshToken: string } | null>;
  storeTokens(accessToken: string, refreshToken: string): Promise<void>;
}

/** Options for createFetchWithAuth */
export interface FetchWithAuthOptions {
  /** Custom refresh function — overrides default refresh logic (used by web app for httpOnly cookie flow) */
  refreshFn?: (apiBaseUrl: string) => Promise<string | null>;
}

/** Create a platform-specific authenticated fetch function */
export function createFetchWithAuth(
  apiBaseUrl: string,
  tokenProvider: TokenProvider,
  options?: FetchWithAuthOptions,
) {
  return async function fetchWithAuth(
    path: string,
    fetchOptions: RequestInit = {},
  ): Promise<Response> {
    const tokens = await tokenProvider.getTokens();
    if (!tokens?.accessToken) throw new Error('Not authenticated');

    const doFetch = (accessToken: string) =>
      fetch(`${apiBaseUrl}${path}`, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

    let res = await doFetch(tokens.accessToken);

    // Auto-refresh on 401 and retry once
    if (res.status === 401) {
      let newAccessToken: string | null = null;

      if (options?.refreshFn) {
        // Custom refresh (e.g., web app uses httpOnly cookie)
        newAccessToken = await options.refreshFn(apiBaseUrl);
      } else if (tokens.refreshToken) {
        // Default: send refresh token in body
        const refreshRes = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: tokens.refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          newAccessToken = data.access_token;
        }
      }

      if (newAccessToken) {
        await tokenProvider.storeTokens(newAccessToken, tokens.refreshToken);
        res = await doFetch(newAccessToken);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    return res;
  };
}
