// Base API client using ofetch with JWT auth

import { ofetch, type $Fetch } from 'ofetch';

/** Create an authenticated API client */
export function createApiClient(
  baseUrl: string,
  getToken: () => string | null,
): $Fetch {
  return ofetch.create({
    baseURL: baseUrl,
    onRequest({ options }) {
      const token = getToken();
      if (token) {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        options.headers = headers;
      }
    },
  });
}
