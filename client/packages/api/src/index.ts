// Server API client — auth, sync, share endpoints
export { createApiClient } from './client';
export { AuthApi } from './auth-api';
export { SyncApi } from './sync-api';
export { ShareApi } from './share-api';

// Sync data transforms — client snake_case <-> backend camelCase
export { toApiItem, fromApiItem, toApiFolder, fromApiFolder } from './sync-transforms';

// Authenticated fetch factory — platform-agnostic JWT fetch with auto-refresh
export { createFetchWithAuth } from './fetch-with-auth';
export type { TokenProvider, FetchWithAuthOptions } from './fetch-with-auth';
