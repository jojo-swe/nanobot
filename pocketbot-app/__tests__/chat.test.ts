/**
 * Tests for src/services/chat.ts
 * Uses a mock WebSocket to avoid real network calls.
 */

import {
  connect,
  disconnect,
  isConnected,
  sendMessage,
  ChatCallbacks,
  ConnectionState,
} from '../src/services/chat';
import type { ServerConnection } from '../src/services/storage';

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

type WsEventType = 'open' | 'message' | 'close' | 'error';

class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  url: string;

  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket._instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  // Test helpers
  _triggerOpen(): void {
    this.onopen?.(new Event('open'));
  }

  _triggerMessage(data: unknown): void {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.onmessage?.(event);
  }

  _triggerClose(code = 1000, reason = ''): void {
    const event = { code, reason, wasClean: code === 1000 } as CloseEvent;
    this.onclose?.(event);
  }

  _triggerError(): void {
    this.onerror?.(new Event('error'));
  }

  static _instances: MockWebSocket[] = [];
  static _reset(): void {
    MockWebSocket._instances = [];
  }
  static _latest(): MockWebSocket {
    return MockWebSocket._instances[MockWebSocket._instances.length - 1];
  }
}

// Install mock globally
(global as any).WebSocket = MockWebSocket;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const CONN: ServerConnection = { url: 'http://localhost:8080', token: '' };
const CONN_AUTH: ServerConnection = { url: 'http://server:9000', token: 'tok123' };

function makeCallbacks(): jest.Mocked<ChatCallbacks> {
  return {
    onStateChange: jest.fn(),
    onMessage: jest.fn(),
    onTyping: jest.fn(),
    onError: jest.fn(),
    onSessionId: jest.fn(),
  };
}

beforeEach(() => {
  MockWebSocket._reset();
  disconnect();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// wsUrl construction
// ---------------------------------------------------------------------------

describe('wsUrl (via connect)', () => {
  it('uses ws:// for http:// URLs', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    expect(ws.url).toMatch(/^ws:\/\//);
  });

  it('uses wss:// for https:// URLs', () => {
    const cb = makeCallbacks();
    connect({ url: 'https://secure.server:443', token: '' }, cb);
    const ws = MockWebSocket._latest();
    expect(ws.url).toMatch(/^wss:\/\//);
  });

  it('appends /ws/chat path', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    expect(ws.url).toContain('/ws/chat');
  });

  it('appends ?token= when token is set', () => {
    const cb = makeCallbacks();
    connect(CONN_AUTH, cb);
    const ws = MockWebSocket._latest();
    expect(ws.url).toContain('?token=tok123');
  });

  it('does not append ?token= when token is empty', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    expect(ws.url).not.toContain('?token=');
  });

  it('strips trailing slash from url', () => {
    const cb = makeCallbacks();
    connect({ url: 'http://localhost:8080/', token: '' }, cb);
    const ws = MockWebSocket._latest();
    expect(ws.url).not.toContain('//ws/chat');
  });
});

// ---------------------------------------------------------------------------
// connect / state transitions
// ---------------------------------------------------------------------------

describe('connect', () => {
  it('calls onStateChange("connecting") immediately', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    expect(cb.onStateChange).toHaveBeenCalledWith('connecting');
  });

  it('calls onStateChange("connected") on open', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    expect(cb.onStateChange).toHaveBeenCalledWith('connected');
  });

  it('calls onSessionId when server sends connected message', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    ws._triggerMessage({ type: 'connected', session_id: 'abc123' });
    expect(cb.onSessionId).toHaveBeenCalledWith('abc123');
  });

  it('calls onMessage for message type', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    ws._triggerMessage({
      type: 'message',
      role: 'assistant',
      content: 'Hello!',
      timestamp: '2024-01-01T00:00:00Z',
    });
    expect(cb.onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', content: 'Hello!' }),
    );
  });

  it('calls onTyping(true) for typing start', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    ws._triggerMessage({ type: 'typing', status: true });
    expect(cb.onTyping).toHaveBeenCalledWith(true);
  });

  it('calls onTyping(false) for typing stop', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    ws._triggerMessage({ type: 'typing', status: false });
    expect(cb.onTyping).toHaveBeenCalledWith(false);
  });

  it('calls onError for error type', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    ws._triggerMessage({ type: 'error', content: 'Something went wrong' });
    expect(cb.onError).toHaveBeenCalledWith('Something went wrong');
  });

  it('ignores unknown message types without crashing', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    expect(() => ws._triggerMessage({ type: 'unknown_type', data: 'x' })).not.toThrow();
  });

  it('ignores invalid JSON without crashing', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    const event = { data: 'not valid json {{{' } as MessageEvent;
    expect(() => ws.onmessage?.(event)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// disconnect
// ---------------------------------------------------------------------------

describe('disconnect', () => {
  it('calls onStateChange("disconnected")', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    cb.onStateChange.mockClear();
    disconnect();
    expect(cb.onStateChange).toHaveBeenCalledWith('disconnected');
  });

  it('isConnected() returns false after disconnect', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    disconnect();
    expect(isConnected()).toBe(false);
  });

  it('is safe to call multiple times', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    expect(() => {
      disconnect();
      disconnect();
      disconnect();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// close event handling
// ---------------------------------------------------------------------------

describe('close event handling', () => {
  it('code 4001 triggers onError with auth message', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    ws._triggerClose(4001, 'Unauthorized');
    expect(cb.onError).toHaveBeenCalledWith(
      expect.stringContaining('Unauthorized'),
    );
    expect(cb.onStateChange).toHaveBeenCalledWith('error');
  });

  it('code 4001 does NOT schedule reconnect', () => {
    jest.useFakeTimers();
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    const instancesBefore = MockWebSocket._instances.length;
    ws._triggerClose(4001);
    jest.runAllTimers();
    // No new WS should have been created
    expect(MockWebSocket._instances.length).toBe(instancesBefore);
    jest.useRealTimers();
  });

  it('code 1001 (idle timeout) triggers immediate reconnect', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    const instancesBefore = MockWebSocket._instances.length;
    ws._triggerClose(1001, 'Going Away');
    // Should have created a new WS immediately
    expect(MockWebSocket._instances.length).toBe(instancesBefore + 1);
  });

  it('normal close (1000) schedules reconnect with backoff', () => {
    jest.useFakeTimers();
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    const instancesBefore = MockWebSocket._instances.length;
    ws._triggerClose(1000);
    // No immediate reconnect
    expect(MockWebSocket._instances.length).toBe(instancesBefore);
    // After timer fires, reconnect happens
    jest.runAllTimers();
    expect(MockWebSocket._instances.length).toBe(instancesBefore + 1);
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe('sendMessage', () => {
  it('returns a ChatMessage with role user', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    const msg = sendMessage('hello world');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello world');
    expect(msg.id).toBeTruthy();
    expect(msg.timestamp).toBeTruthy();
  });

  it('sends JSON to the WebSocket', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerOpen();
    sendMessage('test message');
    expect(ws.sent).toHaveLength(1);
    const sent = JSON.parse(ws.sent[0]);
    expect(sent.type).toBe('message');
    expect(sent.content).toBe('test message');
  });

  it('returns message without sending when not connected', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    // Don't trigger open — readyState stays OPEN in mock but ws is not "open"
    // Simulate closed state
    ws.readyState = MockWebSocket.CLOSED;
    const msg = sendMessage('offline message');
    expect(msg.content).toBe('offline message');
    expect(ws.sent).toHaveLength(0);
  });

  it('each message gets a unique id', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    const m1 = sendMessage('a');
    const m2 = sendMessage('b');
    const m3 = sendMessage('c');
    expect(new Set([m1.id, m2.id, m3.id]).size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// isConnected
// ---------------------------------------------------------------------------

describe('isConnected', () => {
  it('returns false before connect', () => {
    expect(isConnected()).toBe(false);
  });

  it('returns true when WS is open', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    expect(isConnected()).toBe(true);
  });

  it('returns false after disconnect', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    MockWebSocket._latest()._triggerOpen();
    disconnect();
    expect(isConnected()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onerror
// ---------------------------------------------------------------------------

describe('onerror', () => {
  it('calls onStateChange("error") on WS error', () => {
    const cb = makeCallbacks();
    connect(CONN, cb);
    const ws = MockWebSocket._latest();
    ws._triggerError();
    expect(cb.onStateChange).toHaveBeenCalledWith('error');
  });
});
