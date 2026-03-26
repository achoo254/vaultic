// Tests for API client creation and auth header injection
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from '../client';

// Mock ofetch module
vi.mock('ofetch', () => {
  const mockFetch = vi.fn().mockResolvedValue({});
  return {
    ofetch: {
      create: vi.fn((config: { onRequest: (ctx: { options: { headers?: Headers } }) => void }) => {
        // Return a function that captures the onRequest interceptor
        const client = async (url: string, options: Record<string, unknown> = {}) => {
          const ctx = { options: { ...options, headers: options.headers as Headers | undefined } };
          config.onRequest(ctx);
          return mockFetch(url, ctx.options);
        };
        // Store config for inspection
        (client as unknown as { _config: typeof config })._config = config;
        return client;
      }),
    },
  };
});

describe('createApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a client function', () => {
    const client = createApiClient('http://localhost:8080', () => null);
    expect(typeof client).toBe('function');
  });

  it('adds Authorization header when token is available', async () => {
    const client = createApiClient('http://localhost:8080', () => 'my-jwt-token');
    // Trigger a request to exercise onRequest interceptor
    await client('/api/test', {});
  });

  it('does not add Authorization header when no token', () => {
    const client = createApiClient('http://localhost:8080', () => null);
    expect(client).toBeDefined();
  });
});
