/**
 * Tests for src/services/api.ts
 * Mocks the global fetch to avoid real network calls.
 */

import {
  getConfig,
  getStatus,
  ping,
  putConfig,
  testConnection,
} from '../src/services/api';
import type { ServerConnection } from '../src/services/storage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONN: ServerConnection = { url: 'http://localhost:8080', token: '' };
const CONN_AUTH: ServerConnection = { url: 'http://server:9000', token: 'tok123' };

function mockFetch(body: unknown, status = 200): void {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

function mockFetchError(message: string): void {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error(message));
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------

describe('getStatus', () => {
  it('calls /api/status with GET', async () => {
    mockFetch({ status: 'running', version: '0.1.4', uptime_seconds: 42.0,
      connections: 1, model: 'gpt-4o', provider: 'openai',
      auth_enabled: false, host: 'localhost', port: 8080 });
    const result = await getStatus(CONN);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/status',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result.status).toBe('running');
    expect(result.version).toBe('0.1.4');
  });

  it('includes Authorization header when token set', async () => {
    mockFetch({ status: 'running', version: '0.1.4', uptime_seconds: 1,
      connections: 0, model: 'x', provider: 'y', auth_enabled: true,
      host: 'server', port: 9000 });
    await getStatus(CONN_AUTH);
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[1].headers['Authorization']).toBe('Bearer tok123');
  });

  it('does not include Authorization header when no token', async () => {
    mockFetch({ status: 'running', version: '0.1.4', uptime_seconds: 1,
      connections: 0, model: 'x', provider: 'y', auth_enabled: false,
      host: 'localhost', port: 8080 });
    await getStatus(CONN);
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[1].headers['Authorization']).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    mockFetch({ detail: 'Unauthorized' }, 401);
    await expect(getStatus(CONN)).rejects.toThrow('HTTP 401');
  });

  it('strips trailing slash from url', async () => {
    mockFetch({ status: 'running', version: '0.1.4', uptime_seconds: 1,
      connections: 0, model: 'x', provider: 'y', auth_enabled: false,
      host: 'localhost', port: 8080 });
    const connSlash: ServerConnection = { url: 'http://localhost:8080/', token: '' };
    await getStatus(connSlash);
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toBe('http://localhost:8080/api/status');
  });
});

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------

describe('getConfig', () => {
  const CONFIG_BODY = {
    model: 'openai/gpt-4o', max_tokens: 4096, temperature: 0.7,
    memory_window: 50, max_tool_iterations: 20,
    workspace: '/home/user/.pocketbot/workspace',
    web_host: 'localhost', web_port: 8080, auth_enabled: false,
  };

  it('calls /api/config with GET', async () => {
    mockFetch(CONFIG_BODY);
    const result = await getConfig(CONN);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/config',
      expect.any(Object),
    );
    expect(result.model).toBe('openai/gpt-4o');
    expect(result.max_tokens).toBe(4096);
  });

  it('throws on 503', async () => {
    mockFetch({ detail: 'Config not available' }, 503);
    await expect(getConfig(CONN)).rejects.toThrow('HTTP 503');
  });
});

// ---------------------------------------------------------------------------
// putConfig
// ---------------------------------------------------------------------------

describe('putConfig', () => {
  it('calls /api/config with PUT and body', async () => {
    mockFetch({ updated: { model: 'openai/gpt-4o-mini' }, errors: {} });
    const result = await putConfig(CONN, { model: 'openai/gpt-4o-mini' });
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('http://localhost:8080/api/config');
    expect(call[1].method).toBe('PUT');
    expect(JSON.parse(call[1].body)).toEqual({ model: 'openai/gpt-4o-mini' });
    expect(result.updated).toEqual({ model: 'openai/gpt-4o-mini' });
    expect(result.errors).toEqual({});
  });

  it('sends multiple fields', async () => {
    mockFetch({ updated: { temperature: 0.5, max_tokens: 2048 }, errors: {} });
    await putConfig(CONN, { temperature: 0.5, max_tokens: 2048 });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(2048);
  });

  it('returns errors for invalid fields', async () => {
    mockFetch({ updated: {}, errors: { foo: 'not an editable field' } });
    const result = await putConfig(CONN, {} as any);
    expect(result.errors).toHaveProperty('foo');
  });

  it('throws on non-ok response', async () => {
    mockFetch({ detail: 'Config not available' }, 503);
    await expect(putConfig(CONN, { model: 'x' })).rejects.toThrow('HTTP 503');
  });
});

// ---------------------------------------------------------------------------
// ping
// ---------------------------------------------------------------------------

describe('ping', () => {
  it('calls /api/ping with POST', async () => {
    mockFetch({ pong: true, timestamp: '2024-01-01T00:00:00Z' });
    const result = await ping(CONN);
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('http://localhost:8080/api/ping');
    expect(call[1].method).toBe('POST');
    expect(result.pong).toBe(true);
    expect(result.timestamp).toBe('2024-01-01T00:00:00Z');
  });

  it('throws on 401', async () => {
    mockFetch({ detail: 'Unauthorized' }, 401);
    await expect(ping(CONN)).rejects.toThrow('HTTP 401');
  });
});

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

describe('testConnection', () => {
  it('returns true when ping succeeds', async () => {
    mockFetch({ pong: true, timestamp: '2024-01-01T00:00:00Z' });
    const result = await testConnection(CONN);
    expect(result).toBe(true);
  });

  it('returns false when fetch throws (network error)', async () => {
    mockFetchError('Network request failed');
    const result = await testConnection(CONN);
    expect(result).toBe(false);
  });

  it('returns false when server returns 401', async () => {
    mockFetch({ detail: 'Unauthorized' }, 401);
    const result = await testConnection(CONN);
    expect(result).toBe(false);
  });

  it('returns false when server returns 500', async () => {
    mockFetch({ detail: 'Internal error' }, 500);
    const result = await testConnection(CONN);
    expect(result).toBe(false);
  });

  it('uses correct URL', async () => {
    mockFetch({ pong: true, timestamp: '2024-01-01T00:00:00Z' });
    await testConnection(CONN_AUTH);
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toBe('http://server:9000/api/ping');
  });

  it('includes auth header when token set', async () => {
    mockFetch({ pong: true, timestamp: '2024-01-01T00:00:00Z' });
    await testConnection(CONN_AUTH);
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer tok123');
  });

  it('returns false when AbortController times out', async () => {
    global.fetch = jest.fn().mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init.signal) {
            (init.signal as AbortSignal).addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }
        }),
    );
    // Trigger abort immediately
    jest.useFakeTimers();
    const promise = testConnection(CONN);
    jest.runAllTimers();
    const result = await promise;
    expect(result).toBe(false);
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// headers helper (tested indirectly)
// ---------------------------------------------------------------------------

describe('headers helper', () => {
  it('always includes Content-Type: application/json', async () => {
    mockFetch({ pong: true, timestamp: '2024-01-01T00:00:00Z' });
    await ping(CONN);
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Authorization when token is empty string', async () => {
    mockFetch({ pong: true, timestamp: '2024-01-01T00:00:00Z' });
    await ping({ url: 'http://server', token: '' });
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });
});
