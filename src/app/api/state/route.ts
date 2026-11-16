import { NextResponse } from 'next/server';
import {
  callAppsScriptProxy,
  getLastGoodPublicState,
  setLastGoodPublicState,
} from '@/lib/appsScriptProxy';
import { buildPublicStatePayload } from '@/lib/serverStore';
import { getNowPHTIso } from '@/lib/time';

export const dynamic = 'force-dynamic';

function sanitizeAndStampState(
  rawState: Record<string, unknown>
): { payload: Record<string, unknown>; cacheControl: string } {
  const nowMs = Date.now();
  // Always stamp serverTime fresh per Vercel request (never trust cached Apps Script timestamp)
  const freshServerTime = getNowPHTIso(nowMs);
  const revealTimeStr = String(rawState.revealTime || '');
  const revealMs = new Date(revealTimeStr).getTime();

  const payload: Record<string, unknown> = {
    ...rawState,
    serverTime: freshServerTime,
  };

  // Double-enforce: never expose gender or correctGuessers before reveal time
  if (isNaN(revealMs) || nowMs < revealMs) {
    delete payload.gender;
    delete payload.correctGuessers;
    payload.revealed = false;
    payload.timeReached = false;
  }

  // Dynamic CDN caching: never let a cached "not revealed" response outlive T-0 by > 2s
  let cacheControl = 'public, s-maxage=2, stale-while-revalidate=2';
  if (!isNaN(revealMs)) {
    const msToReveal = revealMs - nowMs;
    if (msToReveal > 0 && msToReveal <= 4000) {
      cacheControl = 'no-store, max-age=0';
    } else if (payload.revealed === true) {
      cacheControl = 'public, s-maxage=2, stale-while-revalidate=4';
    }
  }

  return { payload, cacheControl };
}

export async function GET() {
  // 1. Try Google Apps Script backend if configured (sent via POST so secret stays out of URL)
  const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
    'POST',
    'getState'
  );

  if (remoteState && remoteState.revealTime && !remoteState.error) {
    const { payload, cacheControl } = sanitizeAndStampState(remoteState);
    // Store safe snapshot (with gender stripped if pre-reveal) for outage fallback
    setLastGoodPublicState(payload);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  }

  // 2. If Apps Script returned HTML/quota/timeout, fall back to last good cached state
  const lastGood = getLastGoodPublicState();
  if (lastGood && process.env.APPS_SCRIPT_URL) {
    const { payload } = sanitizeAndStampState(lastGood);
    return NextResponse.json(
      { ...payload, staleFallback: true },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  // 3. Fallback to stateful server store (Local / Mock mode when APPS_SCRIPT_URL is unset)
  const localPayload = buildPublicStatePayload();
  const { payload, cacheControl } = sanitizeAndStampState(localPayload);
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': cacheControl,
    },
  });
}
