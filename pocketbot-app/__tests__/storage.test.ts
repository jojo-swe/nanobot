/**
 * Tests for src/services/storage.ts
 * Uses the in-memory AsyncStorage mock.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearChatHistory,
  clearConnection,
  loadChatHistory,
  loadConnection,
  PersistedMessage,
  saveConnection,
  saveChatHistory,
} from '../src/services/storage';

// Reset mock store before each test
beforeEach(() => {
  (AsyncStorage as any)._reset();
});

// ---------------------------------------------------------------------------
// loadConnection
// ---------------------------------------------------------------------------

describe('loadConnection', () => {
  it('returns empty defaults when nothing stored', async () => {
    const conn = await loadConnection();
    expect(conn.url).toBe('');
    expect(conn.token).toBe('');
  });

  it('returns stored url and token', async () => {
    await AsyncStorage.setItem('pocketbot_server_url', 'http://192.168.1.10:8080');
    await AsyncStorage.setItem('pocketbot_auth_token', 'tok-abc');
    const conn = await loadConnection();
    expect(conn.url).toBe('http://192.168.1.10:8080');
    expect(conn.token).toBe('tok-abc');
  });

  it('returns empty string for missing token when url is set', async () => {
    await AsyncStorage.setItem('pocketbot_server_url', 'http://myserver');
    const conn = await loadConnection();
    expect(conn.url).toBe('http://myserver');
    expect(conn.token).toBe('');
  });

  it('returns defaults when AsyncStorage throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage error'));
    const conn = await loadConnection();
    expect(conn.url).toBe('');
    expect(conn.token).toBe('');
  });
});

// ---------------------------------------------------------------------------
// saveConnection
// ---------------------------------------------------------------------------

describe('saveConnection', () => {
  it('persists url and token', async () => {
    await saveConnection({ url: 'http://server:8080', token: 'mytoken' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'pocketbot_server_url',
      'http://server:8080',
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'pocketbot_auth_token',
      'mytoken',
    );
  });

  it('roundtrip: save then load returns same values', async () => {
    const original = { url: 'http://10.0.0.1:9090', token: 'secret-tok' };
    await saveConnection(original);
    const loaded = await loadConnection();
    expect(loaded).toEqual(original);
  });

  it('overwrites previous values', async () => {
    await saveConnection({ url: 'http://old', token: 'old-tok' });
    await saveConnection({ url: 'http://new', token: 'new-tok' });
    const conn = await loadConnection();
    expect(conn.url).toBe('http://new');
    expect(conn.token).toBe('new-tok');
  });

  it('saves empty token', async () => {
    await saveConnection({ url: 'http://server', token: '' });
    const conn = await loadConnection();
    expect(conn.token).toBe('');
  });
});

// ---------------------------------------------------------------------------
// clearConnection
// ---------------------------------------------------------------------------

describe('clearConnection', () => {
  it('removes url and token from storage', async () => {
    await saveConnection({ url: 'http://server', token: 'tok' });
    await clearConnection();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pocketbot_server_url');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pocketbot_auth_token');
  });

  it('loadConnection returns defaults after clear', async () => {
    await saveConnection({ url: 'http://server', token: 'tok' });
    await clearConnection();
    const conn = await loadConnection();
    expect(conn.url).toBe('');
    expect(conn.token).toBe('');
  });
});

// ---------------------------------------------------------------------------
// loadChatHistory
// ---------------------------------------------------------------------------

describe('loadChatHistory', () => {
  it('returns empty array when nothing stored', async () => {
    const history = await loadChatHistory();
    expect(history).toEqual([]);
  });

  it('returns parsed messages', async () => {
    const msgs: PersistedMessage[] = [
      { id: '1', role: 'user', content: 'hello', timestamp: '2024-01-01T00:00:00Z' },
      { id: '2', role: 'assistant', content: 'hi', timestamp: '2024-01-01T00:00:01Z' },
    ];
    await AsyncStorage.setItem('pocketbot_chat_history', JSON.stringify(msgs));
    const history = await loadChatHistory();
    expect(history).toHaveLength(2);
    expect(history[0].content).toBe('hello');
    expect(history[1].role).toBe('assistant');
  });

  it('returns empty array on invalid JSON', async () => {
    await AsyncStorage.setItem('pocketbot_chat_history', 'not-json{{{');
    const history = await loadChatHistory();
    expect(history).toEqual([]);
  });

  it('returns empty array when AsyncStorage throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const history = await loadChatHistory();
    expect(history).toEqual([]);
  });

  it('returns empty array for null stored value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const history = await loadChatHistory();
    expect(history).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// saveChatHistory
// ---------------------------------------------------------------------------

describe('saveChatHistory', () => {
  const makeMsg = (i: number): PersistedMessage => ({
    id: String(i),
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `message ${i}`,
    timestamp: new Date(i * 1000).toISOString(),
  });

  it('saves messages as JSON', async () => {
    const msgs = [makeMsg(1), makeMsg(2)];
    await saveChatHistory(msgs);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'pocketbot_chat_history',
      JSON.stringify(msgs),
    );
  });

  it('trims to last 200 messages', async () => {
    const msgs = Array.from({ length: 250 }, (_, i) => makeMsg(i));
    await saveChatHistory(msgs);
    const stored = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
    ) as PersistedMessage[];
    expect(stored).toHaveLength(200);
    // Should keep the LAST 200
    expect(stored[0].id).toBe('50');
    expect(stored[199].id).toBe('249');
  });

  it('saves exactly 200 messages without trimming', async () => {
    const msgs = Array.from({ length: 200 }, (_, i) => makeMsg(i));
    await saveChatHistory(msgs);
    const stored = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
    ) as PersistedMessage[];
    expect(stored).toHaveLength(200);
  });

  it('saves empty array', async () => {
    await saveChatHistory([]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'pocketbot_chat_history',
      '[]',
    );
  });

  it('is non-fatal when AsyncStorage throws', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('quota'));
    await expect(saveChatHistory([makeMsg(1)])).resolves.toBeUndefined();
  });

  it('roundtrip: save then load returns same messages', async () => {
    const msgs = [makeMsg(1), makeMsg(2), makeMsg(3)];
    await saveChatHistory(msgs);
    const loaded = await loadChatHistory();
    expect(loaded).toHaveLength(3);
    expect(loaded[0].id).toBe('1');
    expect(loaded[2].content).toBe('message 3');
  });
});

// ---------------------------------------------------------------------------
// clearChatHistory
// ---------------------------------------------------------------------------

describe('clearChatHistory', () => {
  it('removes chat history key', async () => {
    await clearChatHistory();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pocketbot_chat_history');
  });

  it('loadChatHistory returns empty after clear', async () => {
    const msgs: PersistedMessage[] = [
      { id: '1', role: 'user', content: 'hi', timestamp: '2024-01-01T00:00:00Z' },
    ];
    await saveChatHistory(msgs);
    await clearChatHistory();
    const history = await loadChatHistory();
    expect(history).toEqual([]);
  });
});
