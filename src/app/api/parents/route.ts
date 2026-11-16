import { NextRequest, NextResponse } from 'next/server';
import { callAppsScriptProxy } from '@/lib/appsScriptProxy';
import { isMockModeEnabled, isValidParentsSlug } from '@/lib/env';
import { getServerStore } from '@/lib/serverStore';
import { getNowPHTIso } from '@/lib/time';
import { RevealGender } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

function buildParentsResponsePayload() {
  const store = getServerStore();
  const nowMs = Date.now();
  const revealMs = new Date(store.settings.reveal_time).getTime();
  const isRevealed =
    nowMs >= revealMs && store.settings.locked && store.settings.gender !== null;

  const boyCount = store.guesses.filter((g) => g.guess === 'boy').length;
  const girlCount = store.guesses.filter((g) => g.guess === 'girl').length;

  return {
    serverTime: getNowPHTIso(nowMs),
    revealTime: store.settings.reveal_time,
    locked: store.settings.locked,
    revealed: isRevealed,
    // Never return the gender value before reveal time, even on the parents page
    gender: isRevealed ? store.settings.gender : null,
    tally: {
      boy: boyCount,
      girl: girlCount,
      total: boyCount + girlCount,
    },
    guesses: store.guesses,
    wishes: store.wishes,
    names: store.names,
    advice: store.advice,
    correctGuessers:
      isRevealed && store.settings.gender
        ? store.guesses
            .filter((g) => g.guess === store.settings.gender)
            .map((g) => g.name)
        : [],
  };
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!isValidParentsSlug(slug)) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const remote = await callAppsScriptProxy<Record<string, unknown>>(
    'POST',
    'getParentsData',
    { slug }
  );
  if (remote && remote.revealTime && !remote.error) {
    return NextResponse.json(remote, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(buildParentsResponsePayload(), {
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, action } = body || {};

    if (!isValidParentsSlug(slug)) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const store = getServerStore();

    if (action === 'setRevealTime') {
      const revealTime = String(body.revealTime || '').trim();
      if (!revealTime || isNaN(new Date(revealTime).getTime())) {
        return NextResponse.json(
          { error: 'Invalid Philippine Standard Time format.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      store.settings.reveal_time = revealTime;
      await callAppsScriptProxy('POST', 'setRevealTime', { slug, revealTime });
      const remote = await callAppsScriptProxy<Record<string, unknown>>(
        'POST',
        'getParentsData',
        { slug }
      );

      return NextResponse.json(
        {
          ok: true,
          data: remote && remote.revealTime ? remote : buildParentsResponsePayload(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'revealNow') {
      const nowIso = getNowPHTIso(Date.now() - 2000);
      store.settings.reveal_time = nowIso;
      await callAppsScriptProxy('POST', 'revealNow', { slug, revealTime: nowIso });
      const remote = await callAppsScriptProxy<Record<string, unknown>>(
        'POST',
        'getParentsData',
        { slug }
      );

      return NextResponse.json(
        {
          ok: true,
          data: remote && remote.revealTime ? remote : buildParentsResponsePayload(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'setGender') {
      const chosen: RevealGender | null =
        body.gender === 'boy' ? 'boy' : body.gender === 'girl' ? 'girl' : null;
      if (!chosen) {
        return NextResponse.json(
          { error: 'Please select Boy or Girl.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const remotePost = await callAppsScriptProxy<{
        ok?: boolean;
        error?: string;
      }>('POST', 'setGender', {
        slug,
        gender: chosen,
      });

      if (remotePost?.error) {
        return NextResponse.json(
          { error: remotePost.error },
          { status: 409, headers: NO_STORE_HEADERS }
        );
      }

      if (!remotePost) {
        if (store.settings.locked) {
          return NextResponse.json(
            {
              error:
                'Gender is already locked on the server and cannot be changed.',
            },
            { status: 409, headers: NO_STORE_HEADERS }
          );
        }
        store.settings.gender = chosen;
        store.settings.locked = true;
      }

      const remote = await callAppsScriptProxy<Record<string, unknown>>(
        'POST',
        'getParentsData',
        { slug }
      );

      return NextResponse.json(
        {
          ok: true,
          data: remote && remote.revealTime ? remote : buildParentsResponsePayload(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Allow parents/doctor to unlock & re-select ONLY before reveal time has passed
    if (
      action === 'resetGenderLock' ||
      (action === 'devResetLock' && isMockModeEnabled())
    ) {
      const remotePost = await callAppsScriptProxy<{
        ok?: boolean;
        error?: string;
      }>('POST', 'resetGenderLock', { slug });

      if (remotePost?.error) {
        return NextResponse.json(
          { error: remotePost.error },
          { status: 403, headers: NO_STORE_HEADERS }
        );
      }

      const nowMs = Date.now();
      const revealMs = new Date(store.settings.reveal_time).getTime();
      if (!remotePost && !isNaN(revealMs) && nowMs >= revealMs) {
        return NextResponse.json(
          { error: 'Cannot change gender after the reveal time has arrived.' },
          { status: 403, headers: NO_STORE_HEADERS }
        );
      }

      store.settings.gender = null;
      store.settings.locked = false;

      const remote = await callAppsScriptProxy<Record<string, unknown>>(
        'POST',
        'getParentsData',
        { slug }
      );

      return NextResponse.json(
        {
          ok: true,
          data: remote && remote.revealTime ? remote : buildParentsResponsePayload(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Unknown action.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: 'Unable to process parent action.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
