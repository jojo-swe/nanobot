/**
 * File upload service — uploads files to the pocketbot /api/upload endpoint.
 */

import { ServerConnection } from './storage';

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
  content_type: string;
}

export interface PendingAttachment {
  /** Local URI (file:// or content://) */
  localUri: string;
  /** Display name */
  name: string;
  /** MIME type */
  mimeType: string;
  /** Server URL after upload, null while uploading */
  serverUrl: string | null;
  /** True if upload is in progress */
  uploading: boolean;
  /** Error message if upload failed */
  error: string | null;
}

/**
 * Upload a file to the server and return the result.
 */
export async function uploadFile(
  conn: ServerConnection,
  localUri: string,
  name: string,
  mimeType: string,
): Promise<UploadResult> {
  const base = conn.url.replace(/\/+$/, '');
  const headers: Record<string, string> = {};
  if (conn.token) {
    headers['Authorization'] = `Bearer ${conn.token}`;
  }

  const body = new FormData();
  body.append('file', {
    uri: localUri,
    name,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(`${base}/api/upload`, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text);
  }

  return res.json() as Promise<UploadResult>;
}

/**
 * Build the full URL for a media file served by the pocketbot server.
 */
export function mediaUrl(conn: ServerConnection, path: string): string {
  const base = conn.url.replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path}`;
}
