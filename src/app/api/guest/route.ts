import { NextRequest, NextResponse } from 'next/server';
import { callAppsScriptProxy } from '@/lib/appsScriptProxy';
import {
  buildPublicStatePayload,
  checkRateLimit,
  FamilySide,
  getServerStore,
  sanitizeText,
} from '@/lib/serverStore';
import { getNowPHTIso } from '@/lib/time';
import { RevealGender } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, _hp } = body || {};

    if (_hp && String(_hp).trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'guest-local';
    if (!checkRateLimit(`${clientIp}:${action}`, 600)) {
      return NextResponse.json(
        { error: 'Please wait a moment before submitting again.' },
        { status: 429 }
      );
    }

    const timestamp = getNowPHTIso();
    const store = getServerStore();

    if (action === 'submitGuess') {
      const name = sanitizeText(body.name, 60);
      const relationship = sanitizeText(body.relationship, 50);
      const rawSide = String(body.side || 'both').toLowerCase();
      const side: FamilySide =
        rawSide === 'mother'
          ? 'mother'
          : rawSide === 'father'
          ? 'father'
          : 'both';
      const guess: RevealGender = body.guess === 'boy' ? 'boy' : 'girl';

      if (!name) {
        return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
      }

      const existingIdx = store.guesses.findIndex(
        (g) => g.name.toLowerCase() === name.toLowerCase()
      );
      if (existingIdx >= 0) {
        store.guesses[existingIdx] = {
          name,
          relationship,
          side,
          guess,
          timestamp,
        };
      } else {
        store.guesses.push({
          name,
          relationship,
          side,
          guess,
          timestamp,
        });
      }

      await callAppsScriptProxy('POST', 'submitGuess', {
        name,
        side,
        relationship,
        guess,
        timestamp,
      });

      const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
        'GET',
        'getState'
      );

      return NextResponse.json({
        ok: true,
        state: remoteState || buildPublicStatePayload(),
      });
    }

    if (action === 'submitWish') {
      const name = sanitizeText(body.name, 80) || 'A Loving Guest';
      const wishForBaby = sanitizeText(body.wish_for_baby, 600);
      const noteForParents = sanitizeText(body.note_for_parents, 600);
      const guess: RevealGender | undefined =
        body.guess === 'boy' || body.guess === 'girl' ? body.guess : undefined;

      if (!wishForBaby) {
        return NextResponse.json(
          { error: 'Please write a short wish for the baby.' },
          { status: 400 }
        );
      }

      store.wishes.unshift({
        name,
        guess,
        wish_for_baby: wishForBaby,
        note_for_parents: noteForParents,
        timestamp,
      });

      await callAppsScriptProxy('POST', 'submitWish', {
        name,
        guess,
        wish_for_baby: wishForBaby,
        note_for_parents: noteForParents,
        timestamp,
      });

      const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
        'GET',
        'getState'
      );

      return NextResponse.json({
        ok: true,
        state: remoteState || buildPublicStatePayload(),
      });
    }

    if (action === 'submitName') {
      const guest = sanitizeText(body.guest, 60) || 'Family Friend';
      const suggestedName = sanitizeText(body.suggested_name, 80);

      if (!suggestedName) {
        return NextResponse.json(
          { error: 'Please enter a name suggestion.' },
          { status: 400 }
        );
      }

      store.names.unshift({
        guest,
        suggested_name: suggestedName,
        timestamp,
      });

      await callAppsScriptProxy('POST', 'submitName', {
        guest,
        suggested_name: suggestedName,
        timestamp,
      });

      const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
        'GET',
        'getState'
      );

      return NextResponse.json({
        ok: true,
        state: remoteState || buildPublicStatePayload(),
      });
    }

    if (action === 'submitAdvice') {
      const guest = sanitizeText(body.guest, 60) || 'Family Friend';
      const advice = sanitizeText(body.advice, 400);

      if (!advice) {
        return NextResponse.json(
          { error: 'Please enter a note of advice.' },
          { status: 400 }
        );
      }

      store.advice.unshift({
        guest,
        advice,
        timestamp,
      });

      await callAppsScriptProxy('POST', 'submitAdvice', {
        guest,
        advice,
        timestamp,
      });

      return NextResponse.json({
        ok: true,
        state: buildPublicStatePayload(),
      });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to process request right now.' },
      { status: 500 }
    );
  }
}
