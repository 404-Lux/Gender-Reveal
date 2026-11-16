/**
 * Server-side proxy client for the Google Apps Script Web App.
 * Keeps APPS_SCRIPT_URL and APPS_SCRIPT_SECRET strictly on the Next.js server.
 */

export async function callAppsScriptProxy<T = unknown>(
  method: 'GET' | 'POST',
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T | null> {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const sharedSecret = process.env.APPS_SCRIPT_SECRET || '';

  if (!scriptUrl || scriptUrl.trim() === '') {
    return null; // Fallback to local/mock serverStore when Apps Script URL is not configured
  }

  try {
    if (method === 'GET') {
      const url = new URL(scriptUrl);
      url.searchParams.set('action', action);
      url.searchParams.set('token', sharedSecret);
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      });

      const res = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } else {
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
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    }
  } catch {
    return null;
  }
}
