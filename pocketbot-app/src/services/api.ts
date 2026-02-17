/**
 * REST API client for the pocketbot server.
 * Mirrors the Web UI endpoints: /api/status, /api/config, /api/ping.
 */

import { ServerConnection } from './storage';

function headers(conn: ServerConnection): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conn.token) {
    h['Authorization'] = `Bearer ${conn.token}`;
  }
  return h;
}

function baseUrl(conn: ServerConnection): string {
  return conn.url.replace(/\/+$/, '');
}

export interface StatusResponse {
  status: string;
  version: string;
  uptime_seconds: number;
  connections: number;
  model: string;
  provider: string;
  auth_enabled: boolean;
  host: string;
  port: number;
}

export interface ConfigResponse {
  model: string;
  max_tokens: number;
  temperature: number;
  memory_window: number;
  max_tool_iterations: number;
  workspace: string;
  web_host: string;
  web_port: number;
  auth_enabled: boolean;
}

export interface ConfigUpdate {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  memory_window?: number;
}

export interface ConfigUpdateResponse {
  updated: Record<string, unknown>;
  errors: Record<string, string>;
}

export interface PingResponse {
  pong: boolean;
  timestamp: string;
}

async function fetchJSON<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getStatus(conn: ServerConnection): Promise<StatusResponse> {
  return fetchJSON<StatusResponse>(`${baseUrl(conn)}/api/status`, {
    headers: headers(conn),
  });
}

export function getConfig(conn: ServerConnection): Promise<ConfigResponse> {
  return fetchJSON<ConfigResponse>(`${baseUrl(conn)}/api/config`, {
    headers: headers(conn),
  });
}

export function putConfig(
  conn: ServerConnection,
  update: ConfigUpdate,
): Promise<ConfigUpdateResponse> {
  return fetchJSON<ConfigUpdateResponse>(`${baseUrl(conn)}/api/config`, {
    method: 'PUT',
    headers: headers(conn),
    body: JSON.stringify(update),
  });
}

export function ping(conn: ServerConnection): Promise<PingResponse> {
  return fetchJSON<PingResponse>(`${baseUrl(conn)}/api/ping`, {
    method: 'POST',
    headers: headers(conn),
  });
}

/**
 * Quick connectivity test — resolves true if /api/ping succeeds.
 */
export async function testConnection(conn: ServerConnection): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetchJSON<PingResponse>(`${baseUrl(conn)}/api/ping`, {
      method: 'POST',
      headers: headers(conn),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}
