import { NextRequest, NextResponse } from 'next/server';
import { callAppsScriptProxy } from '@/lib/appsScriptProxy';
import {
  collapseControlChars,
  containsProfanityOrSlur,
  sanitizeSheetFormula,
} from '@/lib/moderation';
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
    const { action, _hp, idempotencyKey, deviceId } = body || {};

    if (_hp && String(_hp).trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'guest-local';
    if (!checkRateLimit(`${clientIp}:${action}`, 500)) {
      return NextResponse.json(
        {
          error: 'Please wait a moment before submitting again.',
          retryable: true,
        },
        { status: 429 }
      );
    }

    const timestamp = getNowPHTIso();
    const store = getServerStore();
    const hasAppsScript = Boolean(
      process.env.APPS_SCRIPT_URL && process.env.APPS_SCRIPT_URL.trim() !== ''
    );

    if (action === 'submitGuess') {
      const name = sanitizeSheetFormula(collapseControlChars(body.name, 40));
      const relationship = sanitizeSheetFormula(
        collapseControlChars(body.relationship, 40)
      );
      const cleanDeviceId = sanitizeText(deviceId, 64);
      const cleanIdempKey = sanitizeText(idempotencyKey, 64);
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

      const flagged = containsProfanityOrSlur(`${name} ${relationship}`);
      const hidden = flagged;
      const revealMs = new Date(store.settings.reveal_time).getTime();
      const isLate = !isNaN(revealMs) && Date.now() >= revealMs;

      if (hasAppsScript) {
        const proxyRes = await callAppsScriptProxy<{
          ok?: boolean;
          error?: string;
          retryable?: boolean;
        }>('POST', 'submitGuess', {
          name,
          side,
          relationship,
          guess,
          deviceId: cleanDeviceId,
          idempotencyKey: cleanIdempKey,
          flagged,
          hidden,
          timestamp,
        });

        if (!proxyRes || proxyRes.error === 'BUSY_RETRY' || proxyRes.retryable) {
          return NextResponse.json(
            {
              error: 'Server is busy right now. Your guess is saved — please retry.',
              retryable: true,
            },
            { status: 503 }
          );
        }

        if (proxyRes.error) {
          return NextResponse.json({ error: proxyRes.error }, { status: 400 });
        }

        const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
          'POST',
          'getState'
        );

        return NextResponse.json({
          ok: true,
          state: remoteState || buildPublicStatePayload(),
        });
      }

      // Local / Mock fallback with deviceId + normalized name deduplication
      const existingIdx = store.guesses.findIndex(
        (g) =>
          (cleanDeviceId && g.deviceId && g.deviceId === cleanDeviceId) ||
          g.name.toLowerCase() === name.toLowerCase()
      );
      if (existingIdx >= 0) {
        store.guesses[existingIdx] = {
          name,
          relationship,
          side,
          guess,
          deviceId: cleanDeviceId || undefined,
          late: isLate,
          hidden,
          flagged,
          timestamp,
        };
      } else {
        store.guesses.push({
          name,
          relationship,
          side,
          guess,
          deviceId: cleanDeviceId || undefined,
          late: isLate,
          hidden,
          flagged,
          timestamp,
        });
      }

      return NextResponse.json({
        ok: true,
        state: buildPublicStatePayload(),
      });
    }

    if (action === 'submitWish') {
      const name =
        sanitizeSheetFormula(collapseControlChars(body.name, 40)) ||
        'A Loving Guest';
      const wishForBaby = sanitizeSheetFormula(
        collapseControlChars(body.wish_for_baby, 25000)
      );
      const noteForParents = sanitizeSheetFormula(
        collapseControlChars(body.note_for_parents, 25000)
      );
      const cleanIdempKey = sanitizeText(idempotencyKey, 64);
      const cleanDeviceId = sanitizeText(deviceId, 64);
      const guess: RevealGender | undefined =
        body.guess === 'boy' || body.guess === 'girl' ? body.guess : undefined;

      if (!wishForBaby) {
        return NextResponse.json(
          { error: 'Please write a short wish for the baby.' },
          { status: 400 }
        );
      }

      const flagged = containsProfanityOrSlur(
        `${name} ${wishForBaby} ${noteForParents}`
      );
      const hidden = flagged;

      if (hasAppsScript) {
        const proxyRes = await callAppsScriptProxy<{
          ok?: boolean;
          error?: string;
          retryable?: boolean;
        }>('POST', 'submitWish', {
          name,
          guess,
          wish_for_baby: wishForBaby,
          note_for_parents: noteForParents,
          deviceId: cleanDeviceId,
          idempotencyKey: cleanIdempKey,
          flagged,
          hidden,
          timestamp,
        });

        if (!proxyRes || proxyRes.error === 'BUSY_RETRY' || proxyRes.retryable) {
          return NextResponse.json(
            {
              error: 'Connection is busy. Your wish is safely saved — tap Retry.',
              retryable: true,
            },
            { status: 503 }
          );
        }

        if (proxyRes.error) {
          return NextResponse.json({ error: proxyRes.error }, { status: 400 });
        }

        const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
          'POST',
          'getState'
        );

        return NextResponse.json({
          ok: true,
          state: remoteState || buildPublicStatePayload(),
        });
      }

      store.wishes.unshift({
        name,
        guess,
        wish_for_baby: wishForBaby,
        note_for_parents: noteForParents,
        hidden,
        flagged,
        timestamp,
      });

      return NextResponse.json({
        ok: true,
        state: buildPublicStatePayload(),
      });
    }

    if (action === 'submitName') {
      const guest =
        sanitizeSheetFormula(collapseControlChars(body.guest, 40)) ||
        'Family Friend';
      const suggestedName = sanitizeSheetFormula(
        collapseControlChars(body.suggested_name, 30)
      );
      const cleanIdempKey = sanitizeText(idempotencyKey, 64);

      if (!suggestedName) {
        return NextResponse.json(
          { error: 'Please enter a name suggestion.' },
          { status: 400 }
        );
      }

      const flagged = containsProfanityOrSlur(`${guest} ${suggestedName}`);
      const hidden = flagged;

      if (hasAppsScript) {
        const proxyRes = await callAppsScriptProxy<{
          ok?: boolean;
          error?: string;
          retryable?: boolean;
        }>('POST', 'submitName', {
          guest,
          suggested_name: suggestedName,
          idempotencyKey: cleanIdempKey,
          flagged,
          hidden,
          timestamp,
        });

        if (!proxyRes || proxyRes.error === 'BUSY_RETRY' || proxyRes.retryable) {
          return NextResponse.json(
            {
              error: 'Server is busy right now. Tap Suggest Name to retry.',
              retryable: true,
            },
            { status: 503 }
          );
        }

        if (proxyRes.error) {
          return NextResponse.json({ error: proxyRes.error }, { status: 400 });
        }

        const remoteState = await callAppsScriptProxy<Record<string, unknown>>(
          'POST',
          'getState'
        );

        return NextResponse.json({
          ok: true,
          state: remoteState || buildPublicStatePayload(),
        });
      }

      store.names.unshift({
        guest,
        suggested_name: suggestedName,
        hidden,
        flagged,
        timestamp,
      });

      return NextResponse.json({
        ok: true,
        state: buildPublicStatePayload(),
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

    if (action === 'restoreGuestByName') {
      const name = collapseControlChars(body.name, 40);
      if (!name) {
        return NextResponse.json({ ok: true, guest: null });
      }

      if (hasAppsScript) {
        const proxyRes = await callAppsScriptProxy<{
          ok?: boolean;
          guest?: {
            name: string;
            side: FamilySide;
            relationship: string;
            guess: RevealGender;
          } | null;
        }>('POST', 'restoreGuestByName', { name });
        return NextResponse.json({
          ok: true,
          guest: proxyRes?.guest || null,
        });
      }

      const targetBase = name.split('·')[0].trim().toLowerCase();
      const found = store.guesses.find(
        (g) => g.name.split('·')[0].trim().toLowerCase() === targetBase
      );
      return NextResponse.json({
        ok: true,
        guest: found
          ? {
              name: found.name,
              side: found.side || 'both',
              relationship: found.relationship || '',
              guess: found.guess,
            }
          : null,
      });
    }

    if (action === 'getMyWish') {
      const cleanDeviceId = sanitizeText(deviceId, 64);
      const name = collapseControlChars(body.name, 40);

      if (hasAppsScript) {
        const proxyRes = await callAppsScriptProxy<{
          ok?: boolean;
          wish?: { wish_for_baby: string; note_for_parents: string } | null;
        }>('POST', 'getMyWish', {
          deviceId: cleanDeviceId,
          name,
        });
        return NextResponse.json({
          ok: true,
          wish: proxyRes?.wish || null,
        });
      }

      const found = store.wishes.find(
        (w) => name && w.name.toLowerCase() === name.toLowerCase()
      );
      return NextResponse.json({
        ok: true,
        wish: found
          ? {
              wish_for_baby: found.wish_for_baby,
              note_for_parents: found.note_for_parents || '',
            }
          : null,
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
