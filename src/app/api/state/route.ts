import { NextResponse } from 'next/server';
import { callAppsScriptProxy } from '@/lib/appsScriptProxy';
import { buildPublicStatePayload } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Try Google Apps Script backend if configured
  const remoteState = await callAppsScriptProxy<Record<string, unknown>>('GET', 'getState');
  if (remoteState && remoteState.serverTime) {
    // Double-enforce on proxy layer: strip gender if serverTime < revealTime
    const sTime = new Date(String(remoteState.serverTime)).getTime();
    const rTime = new Date(String(remoteState.revealTime)).getTime();
    if (sTime < rTime) {
      delete remoteState.gender;
      delete remoteState.correctGuessers;
      remoteState.revealed = false;
    }
    return NextResponse.json(remoteState, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // 2. Fallback to stateful server store (Mock / Dev mode)
  const payload = buildPublicStatePayload();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
