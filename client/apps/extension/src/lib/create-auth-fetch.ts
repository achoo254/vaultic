// Extension-specific authenticated fetch — wires chrome.storage tokens to generic fetchWithAuth
import { createFetchWithAuth, type TokenProvider } from '@vaultic/api';
import { getTokens, storeTokens } from './session-storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const chromeTokenProvider: TokenProvider = {
  getTokens,
  storeTokens,
};

/** Pre-configured fetchWithAuth for the extension (chrome.storage backed) */
export const fetchWithAuth = createFetchWithAuth(API_BASE_URL, chromeTokenProvider);
