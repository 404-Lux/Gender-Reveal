import { RevealGender } from './tokens';
import { getDefaultRevealTimePHT, getNowPHTIso } from './time';

export type FamilySide = 'mother' | 'father' | 'both';

export interface GuessEntry {
  name: string;
  guess: RevealGender;
  side: FamilySide;
  relationship?: string;
  timestamp: string;
}

export interface WishEntry {
  name: string;
  guess?: RevealGender;
  wish_for_baby: string;
  note_for_parents: string;
  timestamp: string;
}

export interface NameSuggestionEntry {
  guest: string;
  suggested_name: string;
  timestamp: string;
}

export interface AdviceEntry {
  guest: string;
  advice: string;
  timestamp: string;
}

export interface RevealSettings {
  reveal_time: string;
  gender: RevealGender | null;
  locked: boolean;
}

export interface ServerStoreData {
  settings: RevealSettings;
  guesses: GuessEntry[];
  wishes: WishEntry[];
  names: NameSuggestionEntry[];
  advice: AdviceEntry[];
}

declare global {
  // eslint-disable-next-line no-var
  var __PAPER_AND_LIGHT_STORE_BASIO_V2__: ServerStoreData | undefined;
  // eslint-disable-next-line no-var
  var __PAPER_AND_LIGHT_RATE_LIMIT__: Map<string, number> | undefined;
}

function createInitialMockStore(): ServerStoreData {
  return {
    settings: {
      reveal_time: getDefaultRevealTimePHT(),
      gender: null,
      locked: false,
    },
    guesses: [
      {
        name: 'Lola Teresita',
        relationship: 'Lola',
        side: 'mother',
        guess: 'girl',
        timestamp: '2026-11-15T17:10:00+08:00',
      },
      {
        name: 'Tito Jun & Tita Maricel',
        relationship: 'Tito & Tita',
        side: 'father',
        guess: 'boy',
        timestamp: '2026-11-15T17:18:00+08:00',
      },
      {
        name: 'Ninang Bea',
        relationship: 'Ninang',
        side: 'mother',
        guess: 'girl',
        timestamp: '2026-11-15T17:25:00+08:00',
      },
      {
        name: 'Ninong Carlo',
        relationship: 'Ninong',
        side: 'father',
        guess: 'boy',
        timestamp: '2026-11-15T17:34:00+08:00',
      },
      {
        name: 'Lolo Ernesto',
        relationship: 'Lolo',
        side: 'father',
        guess: 'boy',
        timestamp: '2026-11-15T17:42:00+08:00',
      },
      {
        name: 'Ate Camille',
        relationship: 'Tita',
        side: 'mother',
        guess: 'girl',
        timestamp: '2026-11-15T18:02:00+08:00',
      },
      {
        name: 'Kuya Miggy',
        relationship: 'Tito',
        side: 'father',
        guess: 'boy',
        timestamp: '2026-11-15T18:15:00+08:00',
      },
      {
        name: 'Tita Leni',
        relationship: 'Tita',
        side: 'both',
        guess: 'girl',
        timestamp: '2026-11-15T18:28:00+08:00',
      },
      {
        name: 'Trisha & Paolo',
        relationship: 'Family Friends',
        side: 'both',
        guess: 'girl',
        timestamp: '2026-11-15T18:45:00+08:00',
      },
    ],
    wishes: [
      {
        name: "Lola Teresita · Mother's Side (Jazzmine)",
        guess: 'girl',
        wish_for_baby:
          'May you grow up surrounded by gentle mornings, good books, and the laughter of your family. Mahal na mahal ka namin, apo.',
        note_for_parents:
          'Jazzmine and Ruhmshynne, take plenty of quiet afternoon naps now. My kitchen is always ready with warm tinola whenever you need rest.',
        timestamp: '2026-11-15T17:12:00+08:00',
      },
      {
        name: "Tito Jun & Tita Maricel · Father's Side (Ruhmshynne)",
        guess: 'boy',
        wish_for_baby:
          'We are cheering for your first steps, Baby Basio! May you always be curious, kind-hearted, and brave.',
        note_for_parents:
          'So proud of you both, Jazzmine and Ruhmshynne! Cannot wait to hold the little one.',
        timestamp: '2026-11-15T17:20:00+08:00',
      },
      {
        name: "Ninang Bea · Mother's Side (Jazzmine)",
        guess: 'girl',
        wish_for_baby:
          'Little one, your Ninang already has a shelf of storybooks waiting for you. Grow up healthy and full of wonder.',
        note_for_parents:
          'Salamat sa pag-share ng moment na ito. Sending the warmest hugs!',
        timestamp: '2026-11-15T17:27:00+08:00',
      },
      {
        name: "Ninong Carlo · Father's Side (Ruhmshynne)",
        guess: 'boy',
        wish_for_baby:
          'Welcome to the loud, loving Basio family! Whether you love music, sports, or painting, Ninong has your back always.',
        note_for_parents:
          'Team puyat starts soon—call me anytime you need midnight coffee delivery.',
        timestamp: '2026-11-15T17:36:00+08:00',
      },
    ],
    names: [
      {
        guest: 'Lola Teresita',
        suggested_name: 'Solana / Mateo Basio',
        timestamp: '2026-11-15T17:14:00+08:00',
      },
      {
        guest: 'Ninang Bea',
        suggested_name: 'Amara / Lucas Basio',
        timestamp: '2026-11-15T17:30:00+08:00',
      },
      {
        guest: 'Kuya Miggy',
        suggested_name: 'Rafael / Tala Basio',
        timestamp: '2026-11-15T18:19:00+08:00',
      },
    ],
    advice: [],
  };
}

const LOCAL_STORAGE_KEY = 'pl_basio_store_v2';

export function getServerStore(): ServerStoreData {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ServerStoreData;
        globalThis.__PAPER_AND_LIGHT_STORE_BASIO_V2__ = parsed;
        return parsed;
      }
    } catch {
      // Ignore
    }
  }
  if (!globalThis.__PAPER_AND_LIGHT_STORE_BASIO_V2__) {
    globalThis.__PAPER_AND_LIGHT_STORE_BASIO_V2__ = createInitialMockStore();
    saveClientStore();
  }
  return globalThis.__PAPER_AND_LIGHT_STORE_BASIO_V2__;
}

export function saveClientStore() {
  if (typeof window !== 'undefined' && globalThis.__PAPER_AND_LIGHT_STORE_BASIO_V2__) {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(globalThis.__PAPER_AND_LIGHT_STORE_BASIO_V2__)
      );
    } catch {
      // Ignore
    }
  }
}

export function checkRateLimit(key: string, minIntervalMs = 1200): boolean {
  if (!globalThis.__PAPER_AND_LIGHT_RATE_LIMIT__) {
    globalThis.__PAPER_AND_LIGHT_RATE_LIMIT__ = new Map();
  }
  const now = Date.now();
  const prev = globalThis.__PAPER_AND_LIGHT_RATE_LIMIT__.get(key) || 0;
  if (now - prev < minIntervalMs) {
    return false;
  }
  globalThis.__PAPER_AND_LIGHT_RATE_LIMIT__.set(key, now);
  return true;
}

export function sanitizeText(input: unknown, maxLen = 280): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').slice(0, maxLen);
}

export function buildPublicStatePayload() {
  const store = getServerStore();
  const nowMs = Date.now();
  const serverTime = getNowPHTIso(nowMs);
  const revealTime = store.settings.reveal_time;
  const revealMs = new Date(revealTime).getTime();

  const isTimeReached = nowMs >= revealMs;
  const revealed =
    isTimeReached && store.settings.locked && store.settings.gender !== null;

  const boyCount = store.guesses.filter((g) => g.guess === 'boy').length;
  const girlCount = store.guesses.filter((g) => g.guess === 'girl').length;

  const motherCount = store.guesses.filter((g) => g.side === 'mother').length;
  const fatherCount = store.guesses.filter((g) => g.side === 'father').length;
  const bothCount = store.guesses.filter((g) => g.side === 'both').length;

  const basePayload: Record<string, unknown> = {
    serverTime,
    revealTime,
    timeReached: isTimeReached,
    revealed,
    locked: store.settings.locked,
    tally: {
      boy: boyCount,
      girl: girlCount,
      total: boyCount + girlCount,
    },
    sideCounts: {
      all: store.guesses.length,
      mother: motherCount,
      father: fatherCount,
      both: bothCount,
    },
    guestWall: store.guesses.slice(-40).map((g) => ({
      name: g.name,
      relationship: g.relationship || '',
      side: g.side || 'both',
      guess: g.guess,
      timestamp: g.timestamp,
    })),
    names: store.names.slice(-20),
  };

  if (revealed && store.settings.gender) {
    basePayload.gender = store.settings.gender;
    basePayload.correctGuessers = store.guesses
      .filter((g) => g.guess === store.settings.gender)
      .map((g) =>
        g.relationship ? `${g.name} · ${g.relationship}` : g.name
      );
  }

  return basePayload;
}

export function buildParentsStatePayload() {
  const store = getServerStore();
  const nowMs = Date.now();
  const revealMs = new Date(store.settings.reveal_time).getTime();
  const isTimeReached = nowMs >= revealMs;
  const revealed =
    isTimeReached && store.settings.locked && store.settings.gender !== null;

  const boyCount = store.guesses.filter((g) => g.guess === 'boy').length;
  const girlCount = store.guesses.filter((g) => g.guess === 'girl').length;

  return {
    serverTime: getNowPHTIso(nowMs),
    revealTime: store.settings.reveal_time,
    locked: store.settings.locked,
    revealed,
    gender: revealed ? store.settings.gender : null,
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
      revealed && store.settings.gender
        ? store.guesses
            .filter((g) => g.guess === store.settings.gender)
            .map((g) =>
              g.relationship ? `${g.name} · ${g.relationship}` : g.name
            )
        : [],
  };
}
