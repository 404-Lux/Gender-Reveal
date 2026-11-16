/**
 * Server-side proxy client for the Google Apps Script Web App.
 * Keeps APPS_SCRIPT_URL and APPS_SCRIPT_SECRET strictly on the Next.js server.
 * All requests use POST with the shared secret in the JSON body (never in query strings).
 */

const APPS_SCRIPT_TIMEOUT_MS = 7000;

declare global {
  // eslint-disable-next-line no-var
  var __PAPER_AND_LIGHT_LAST_GOOD_STATE__: Record<string, unknown> | undefined;
}

export function getLastGoodPublicState(): Record<string, unknown> | null {
  return globalThis.__PAPER_AND_LIGHT_LAST_GOOD_STATE__ || null;
}

export function setLastGoodPublicState(state: Record<string, unknown>) {
  globalThis.__PAPER_AND_LIGHT_LAST_GOOD_STATE__ = state;
}

export async function callAppsScriptProxy<T = unknown>(
  _method: 'GET' | 'POST',
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T | null> {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const sharedSecret = process.env.APPS_SCRIPT_SECRET || '';

  if (!scriptUrl || scriptUrl.trim() === '') {
    return null; // Fallback to local/mock serverStore when Apps Script URL is not configured
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        token: sharedSecret,
        ...payload,
      }),
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();

    // Detect HTML error/quota pages or non-JSON responses from Google Apps Script
    const trimmed = rawText.trim();
    if (
      contentType.includes('text/html') ||
      trimmed.startsWith('<') ||
      (!trimmed.startsWith('{') && !trimmed.startsWith('['))
    ) {
      return null;
    }

    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
