'use client';

export interface PendingWriteItem {
  idempotencyKey: string;
  deviceId: string;
  action: 'submitGuess' | 'submitWish' | 'submitName';
  payload: Record<string, unknown>;
  createdAt: string;
}

const DEVICE_ID_KEY = 'pl_v2_device_id';
const WRITE_QUEUE_KEY = 'pl_v2_write_queue';
const WISH_DRAFT_KEY = 'pl_v2_wish_draft';

export function generateUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const created = generateUuid();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return generateUuid();
  }
}

export function getPendingWrites(): PendingWriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WRITE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingWrites(items: PendingWriteItem[]) {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(WRITE_QUEUE_KEY);
    } else {
      window.localStorage.setItem(WRITE_QUEUE_KEY, JSON.stringify(items));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function enqueuePendingWrite(
  action: PendingWriteItem['action'],
  payload: Record<string, unknown>,
  existingKey?: string
): PendingWriteItem {
  const item: PendingWriteItem = {
    idempotencyKey: existingKey || generateUuid(),
    deviceId: getOrCreateDeviceId(),
    action,
    payload,
    createdAt: new Date().toISOString(),
  };
  const current = getPendingWrites().filter(
    (x) => x.idempotencyKey !== item.idempotencyKey
  );
  current.push(item);
  savePendingWrites(current);
  return item;
}

export function markPendingWriteDone(idempotencyKey: string) {
  const remaining = getPendingWrites().filter(
    (x) => x.idempotencyKey !== idempotencyKey
  );
  savePendingWrites(remaining);
}

export async function sendWriteWithQueue(
  action: PendingWriteItem['action'],
  payload: Record<string, unknown>,
  existingKey?: string
): Promise<{
  ok: boolean;
  retryable?: boolean;
  error?: string;
  state?: unknown;
  idempotencyKey: string;
}> {
  const queued = enqueuePendingWrite(action, payload, existingKey);

  try {
    const res = await fetch('/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        idempotencyKey: queued.idempotencyKey,
        deviceId: queued.deviceId,
        ...payload,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
      markPendingWriteDone(queued.idempotencyKey);
      return {
        ok: true,
        state: json.state,
        idempotencyKey: queued.idempotencyKey,
      };
    }

    const retryable =
      res.status === 503 ||
      res.status === 429 ||
      res.status >= 500 ||
      Boolean(json.retryable);

    if (!retryable && res.status >= 400 && res.status < 500) {
      // Non-retryable validation error
      markPendingWriteDone(queued.idempotencyKey);
    }

    return {
      ok: false,
      retryable,
      error: json.error || 'Could not reach the celebration server.',
      idempotencyKey: queued.idempotencyKey,
    };
  } catch {
    return {
      ok: false,
      retryable: true,
      error: 'Connection interrupted. Your message is safely saved for retry.',
      idempotencyKey: queued.idempotencyKey,
    };
  }
}

export async function flushPendingWrites(): Promise<{
  flushedCount: number;
  latestState?: unknown;
}> {
  const items = getPendingWrites();
  if (items.length === 0) return { flushedCount: 0 };

  let flushedCount = 0;
  let latestState: unknown;

  for (const item of items) {
    const res = await sendWriteWithQueue(
      item.action,
      item.payload,
      item.idempotencyKey
    );
    if (res.ok) {
      flushedCount += 1;
      if (res.state) latestState = res.state;
    } else if (res.retryable) {
      // Stop flushing until connection/lock clears
      break;
    }
  }

  return { flushedCount, latestState };
}

export function loadWishDraft(): { wishForBaby: string; noteForParents: string } {
  if (typeof window === 'undefined') {
    return { wishForBaby: '', noteForParents: '' };
  }
  try {
    const raw = window.localStorage.getItem(WISH_DRAFT_KEY);
    if (!raw) return { wishForBaby: '', noteForParents: '' };
    const parsed = JSON.parse(raw);
    return {
      wishForBaby: typeof parsed.wishForBaby === 'string' ? parsed.wishForBaby : '',
      noteForParents:
        typeof parsed.noteForParents === 'string' ? parsed.noteForParents : '',
    };
  } catch {
    return { wishForBaby: '', noteForParents: '' };
  }
}

export function saveWishDraft(wishForBaby: string, noteForParents: string) {
  if (typeof window === 'undefined') return;
  try {
    if (!wishForBaby && !noteForParents) {
      window.localStorage.removeItem(WISH_DRAFT_KEY);
    } else {
      window.localStorage.setItem(
        WISH_DRAFT_KEY,
        JSON.stringify({ wishForBaby, noteForParents })
      );
    }
  } catch {
    // Ignore
  }
}
