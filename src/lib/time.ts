/**
 * Philippine Standard Time (PHT / Asia/Manila / UTC+8) Utilities
 * Guarantees consistent Asia/Manila display even if a guest's phone timezone or clock is wrong.
 */

export const PHT_TIMEZONE = 'Asia/Manila';
export const PHT_OFFSET_SUFFIX = '+08:00';

export interface PhilippineDateParts {
  weekday: string;
  monthLong: string;
  monthShort: string;
  monthNumber: number;
  day: string;
  dayNumber: number;
  year: string;
  yearNumber: number;
  hour12: number;
  minute: string;
  minuteNumber: number;
  period: 'AM' | 'PM';
  formattedTime: string;
  formattedDate: string;
}

/**
 * Extracts structured date & time components explicitly in Asia/Manila (UTC+8)
 * for editorial letterpress calendar & clock cards.
 */
export function getPhilippineDateParts(isoString: string): PhilippineDateParts {
  try {
    const d = new Date(isoString);
    const validDate = isNaN(d.getTime())
      ? new Date(getDefaultRevealTimePHT())
      : d;

    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: PHT_TIMEZONE,
      weekday: 'long',
    }).format(validDate);

    const monthLong = new Intl.DateTimeFormat('en-US', {
      timeZone: PHT_TIMEZONE,
      month: 'long',
    }).format(validDate);

    const monthShort = new Intl.DateTimeFormat('en-US', {
      timeZone: PHT_TIMEZONE,
      month: 'short',
    })
      .format(validDate)
      .toUpperCase();

    const phtMs = validDate.getTime() + 8 * 60 * 60 * 1000;
    const phtDate = new Date(phtMs);

    const yearNumber = phtDate.getUTCFullYear();
    const monthNumber = phtDate.getUTCMonth() + 1;
    const dayNumber = phtDate.getUTCDate();
    const hour24 = phtDate.getUTCHours();
    const minuteNumber = phtDate.getUTCMinutes();

    const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minute = String(minuteNumber).padStart(2, '0');
    const day = String(dayNumber).padStart(2, '0');
    const year = String(yearNumber);

    return {
      weekday,
      monthLong,
      monthShort,
      monthNumber,
      day,
      dayNumber,
      year,
      yearNumber,
      hour12,
      minute,
      minuteNumber,
      period,
      formattedTime: `${hour12}:${minute} ${period}`,
      formattedDate: `${weekday}, ${monthLong} ${dayNumber}, ${year}`,
    };
  } catch {
    return {
      weekday: 'Saturday',
      monthLong: 'November',
      monthShort: 'NOV',
      monthNumber: 11,
      day: '21',
      dayNumber: 21,
      year: '2026',
      yearNumber: 2026,
      hour12: 7,
      minute: '00',
      minuteNumber: 0,
      period: 'PM',
      formattedTime: '7:00 PM',
      formattedDate: 'Saturday, November 21, 2026',
    };
  }
}

/**
 * Builds an ISO 8601 string with explicit +08:00 offset from structured PHT date/time parts.
 */
export function buildPhtIsoFromParts(parts: {
  year: number;
  month: number;
  day: number;
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
}): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(Math.min(12, Math.max(1, parts.month))).padStart(2, '0');
  const maxDays = new Date(parts.year, parts.month, 0).getDate();
  const d = String(Math.min(maxDays, Math.max(1, parts.day))).padStart(2, '0');

  let hour24 = parts.hour12 % 12;
  if (parts.period === 'PM') hour24 += 12;
  const hh = String(hour24).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parts.minute))).padStart(2, '0');

  return `${y}-${m}-${d}T${hh}:${mm}:00${PHT_OFFSET_SUFFIX}`;
}

/**
 * Formats an ISO 8601 timestamp explicitly in Philippine Standard Time (Asia/Manila)
 * e.g., "Saturday, November 21 · 7:00 PM"
 */
export function formatPhilippineTime(
  isoString: string,
  includeFullDate = true
): string {
  const parts = getPhilippineDateParts(isoString);
  if (!includeFullDate) {
    return `${parts.weekday}, ${parts.formattedTime}`;
  }
  return `${parts.weekday}, ${parts.monthLong} ${parts.dayNumber} · ${parts.formattedTime}`;
}

/**
 * Formats an ISO timestamp for an <input type="datetime-local"> explicitly in PHT (Asia/Manila)
 */
export function toPhtDateTimeLocalValue(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const phtMs = date.getTime() + 8 * 60 * 60 * 1000;
    return new Date(phtMs).toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

/**
 * Converts a datetime-local string ("YYYY-MM-DDTHH:mm") entered in PHT into an ISO 8601 string with +08:00
 */
export function fromPhtDateTimeLocalValue(localValue: string): string {
  if (!localValue) return getDefaultRevealTimePHT();
  const normalized = localValue.length === 16 ? `${localValue}:00` : localValue;
  return `${normalized}${PHT_OFFSET_SUFFIX}`;
}

/**
 * Formats current server time as ISO 8601 with explicit +08:00 offset
 */
export function getNowPHTIso(nowMs: number = Date.now()): string {
  const phtMs = nowMs + 8 * 60 * 60 * 1000;
  const iso = new Date(phtMs).toISOString().replace('Z', '');
  return `${iso.slice(0, 19)}${PHT_OFFSET_SUFFIX}`;
}

/**
 * Default reveal time in PHT (Saturday 7:00 PM PHT)
 */
export function getDefaultRevealTimePHT(): string {
  return '2026-11-21T19:00:00+08:00';
}

export interface CountdownBreakdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isFinalMinute: boolean;
  isFinalTenSeconds: boolean;
  isFinalThreeSeconds: boolean;
  isExpired: boolean;
}

/**
 * Computes countdown breakdown using server-synced clock offset so all phones hit 0 simultaneously.
 */
export function getSyncedCountdown(
  revealTimeIso: string,
  serverOffsetMs: number = 0,
  nowClientMs: number = Date.now()
): CountdownBreakdown {
  const syncedNowMs = nowClientMs + serverOffsetMs;
  const targetMs = new Date(revealTimeIso).getTime();
  const diff = Math.max(0, targetMs - syncedNowMs);

  const totalSeconds = Math.ceil(diff / 1000);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    totalMs: diff,
    days,
    hours,
    minutes,
    seconds,
    isFinalMinute: diff > 0 && diff <= 60_000,
    isFinalTenSeconds: diff > 0 && totalSeconds <= 10,
    isFinalThreeSeconds: diff > 0 && totalSeconds <= 3,
    isExpired: diff <= 0,
  };
}

/**
 * Generates Google Calendar URL anchored to the PHT reveal time.
 */
export function createGoogleCalendarUrl(params: {
  title: string;
  details: string;
  revealTimeIso: string;
  location?: string;
}): string {
  const start = new Date(params.revealTimeIso);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: params.details,
    location: params.location || 'Virtual Gathering',
    ctz: PHT_TIMEZONE,
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

/**
 * Generates and downloads an .ics calendar file anchored to PHT.
 */
export function downloadIcsFile(params: {
  title: string;
  details: string;
  revealTimeIso: string;
  url?: string;
}) {
  if (typeof window === 'undefined') return;
  const start = new Date(params.revealTimeIso);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paper & Light//Virtual Gender Reveal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:reveal-${start.getTime()}@paperandlight.ph`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.details.replace(/\n/g, '\\n')}`,
    `URL:${params.url || window.location.origin}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'baby-basio-gender-reveal.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
