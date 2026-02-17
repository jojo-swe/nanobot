/**
 * Persistent storage for server connection settings.
 * Uses AsyncStorage (works on all platforms including web).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_URL: 'pocketbot_server_url',
  AUTH_TOKEN: 'pocketbot_auth_token',
};

export interface ServerConnection {
  url: string;      // e.g. "http://192.168.1.50:8080"
  token: string;    // bearer token (empty = no auth)
}

const DEFAULT: ServerConnection = {
  url: '',
  token: '',
};

export async function loadConnection(): Promise<ServerConnection> {
  try {
    const url = await AsyncStorage.getItem(KEYS.SERVER_URL);
    const token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return {
      url: url ?? DEFAULT.url,
      token: token ?? DEFAULT.token,
    };
  } catch {
    return DEFAULT;
  }
}

export async function saveConnection(conn: ServerConnection): Promise<void> {
  await AsyncStorage.setItem(KEYS.SERVER_URL, conn.url);
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, conn.token);
}

export async function clearConnection(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.SERVER_URL);
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}
