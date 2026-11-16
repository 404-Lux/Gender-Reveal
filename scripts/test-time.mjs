import assert from 'node:assert/strict';

function buildPhtIsoFromParts(parts) {
  const y = String(parts.year).padStart(4, '0');
  const m = String(Math.min(12, Math.max(1, parts.month))).padStart(2, '0');
  const maxDays = new Date(parts.year, parts.month, 0).getDate();
  const d = String(Math.min(maxDays, Math.max(1, parts.day))).padStart(2, '0');

  let hour24 = parts.hour12 % 12;
  if (parts.period === 'PM') hour24 += 12;
  const hh = String(hour24).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parts.minute))).padStart(2, '0');

  return `${y}-${m}-${d}T${hh}:${mm}:00+08:00`;
}

// 12:00 AM -> 00:00
assert.equal(
  buildPhtIsoFromParts({
    year: 2026,
    month: 11,
    day: 21,
    hour12: 12,
    minute: 0,
    period: 'AM',
  }),
  '2026-11-21T00:00:00+08:00',
  '12:00 AM must map to 00:00'
);

// 12:00 PM -> 12:00
assert.equal(
  buildPhtIsoFromParts({
    year: 2026,
    month: 11,
    day: 21,
    hour12: 12,
    minute: 0,
    period: 'PM',
  }),
  '2026-11-21T12:00:00+08:00',
  '12:00 PM must map to 12:00'
);

// 1:05 AM -> 01:05
assert.equal(
  buildPhtIsoFromParts({
    year: 2026,
    month: 11,
    day: 21,
    hour12: 1,
    minute: 5,
    period: 'AM',
  }),
  '2026-11-21T01:05:00+08:00'
);

// 7:49 PM -> 19:49
assert.equal(
  buildPhtIsoFromParts({
    year: 2026,
    month: 11,
    day: 21,
    hour12: 7,
    minute: 49,
    period: 'PM',
  }),
  '2026-11-21T19:49:00+08:00'
);

console.log('All 12 AM / 12 PM PHT time conversion tests passed.');
