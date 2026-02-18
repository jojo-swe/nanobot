/**
 * In-memory mock for @react-native-async-storage/async-storage.
 * Resets between tests via jest.clearAllMocks() or manual clear().
 */

const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return store[key] ?? null;
  }),
  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string): Promise<void> => {
    delete store[key];
  }),
  clear: jest.fn(async (): Promise<void> => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  getAllKeys: jest.fn(async (): Promise<string[]> => {
    return Object.keys(store);
  }),
  multiGet: jest.fn(
    async (keys: string[]): Promise<[string, string | null][]> => {
      return keys.map((k) => [k, store[k] ?? null]);
    },
  ),
  multiSet: jest.fn(async (pairs: [string, string][]): Promise<void> => {
    pairs.forEach(([k, v]) => {
      store[k] = v;
    });
  }),
  multiRemove: jest.fn(async (keys: string[]): Promise<void> => {
    keys.forEach((k) => delete store[k]);
  }),
  /** Helper for tests: wipe the in-memory store and reset all mock call counts. */
  _reset(): void {
    Object.keys(store).forEach((k) => delete store[k]);
    jest.clearAllMocks();
  },
};

export default AsyncStorage;
