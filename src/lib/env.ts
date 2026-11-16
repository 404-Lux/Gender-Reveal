/**
 * Centralized Environment & Security Helpers
 * Never expose PARENTS_SLUG or APPS_SCRIPT_SECRET to client bundles.
 */

export function isMockModeEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') {
    return false;
  }
  return process.env.NEXT_PUBLIC_MOCK === 'true';
}

export function getParentsSlug(): string | null {
  const slug = (process.env.PARENTS_SLUG || '').trim();
  if (slug.length < 24) {
    return null;
  }
  return slug;
}

export function isValidParentsSlug(candidate: string | null | undefined): boolean {
  const expected = getParentsSlug();
  if (!expected || !candidate) return false;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return diff === 0;
}

export function getBabySurname(): string {
  const raw = (process.env.NEXT_PUBLIC_BABY_SURNAME || '').trim();
  return raw || 'Basio';
}

export function getCoupleNames(): string {
  const raw = (process.env.NEXT_PUBLIC_COUPLE_NAMES || '').trim();
  return raw || 'Jazzmine & Ruhmshynne Basio';
}
