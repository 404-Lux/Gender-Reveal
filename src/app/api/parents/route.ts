import { NextRequest, NextResponse } from 'next/server';
import { callAppsScriptProxy } from '@/lib/appsScriptProxy';
import { getServerStore } from '@/lib/serverStore';
import { getNowPHTIso } from '@/lib/time';
import { RevealGender } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

function isValidSecretSlug(slug: string | null | undefined): boolean {
  const expected = process.env.PARENTS_SECRET_SLUG || 'basio-secret-2026';
  return Boolean(
    slug &&
      (slug === expected ||
        slug === 'basio-secret-2026' ||
        slug === 'alonzo-secret-2026')
  );
}

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
  if (!isValidSecretSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const remote = await callAppsScriptProxy<Record<string, unknown>>(
    'GET',
    'getParentsData',
    { slug }
  );
  if (remote && remote.revealTime) {
    return NextResponse.json(remote);
  }

  return NextResponse.json(buildParentsResponsePayload());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, action } = body || {};

    if (!isValidSecretSlug(slug)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const store = getServerStore();

    if (action === 'setRevealTime') {
      const revealTime = String(body.revealTime || '').trim();
      if (!revealTime || isNaN(new Date(revealTime).getTime())) {
        return NextResponse.json(
          { error: 'Invalid Philippine Standard Time format.' },
          { status: 400 }
        );
      }

      store.settings.reveal_time = revealTime;
      await callAppsScriptProxy('POST', 'setRevealTime', { slug, revealTime });

      return NextResponse.json({
        ok: true,
        data: buildParentsResponsePayload(),
      });
    }

    if (action === 'revealNow') {
      // Set reveal_time to 2 seconds ago in PHT so all connected guests immediately enter the reveal sequence
      const nowIso = getNowPHTIso(Date.now() - 2000);
      store.settings.reveal_time = nowIso;
      await callAppsScriptProxy('POST', 'revealNow', { slug, revealTime: nowIso });

      return NextResponse.json({
        ok: true,
        data: buildParentsResponsePayload(),
      });
    }

    if (action === 'setGender') {
      // CRITICAL: Server-side lock — once locked, reject any change
      if (store.settings.locked) {
        return NextResponse.json(
          {
            error:
              'Gender is already locked on the server and cannot be changed.',
          },
          { status: 409 }
        );
      }

      const chosen: RevealGender | null =
        body.gender === 'boy' ? 'boy' : body.gender === 'girl' ? 'girl' : null;
      if (!chosen) {
        return NextResponse.json(
          { error: 'Please select Boy or Girl.' },
          { status: 400 }
        );
      }

      store.settings.gender = chosen;
      store.settings.locked = true;

      await callAppsScriptProxy('POST', 'setGender', {
        slug,
        gender: chosen,
      });

      return NextResponse.json({
        ok: true,
        data: buildParentsResponsePayload(),
      });
    }

    // Dev-only reset in mock mode so developers/testers can re-test the gender locking flow
    if (
      action === 'devResetLock' &&
      process.env.NEXT_PUBLIC_MOCK === 'true'
    ) {
      store.settings.gender = null;
      store.settings.locked = false;
      return NextResponse.json({
        ok: true,
        data: buildParentsResponsePayload(),
      });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to process parent action.' },
      { status: 500 }
    );
  }
}
