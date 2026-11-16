import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * T-0 Reveal Thundering Herd Load Test (STAGING ONLY)
 *
 * Simulates 2x the expected guest count all polling /api/state within a 3-second window at T-0.
 *
 * Usage:
 *   BASE_URL=https://your-staging-preview.vercel.app GUEST_COUNT=80 k6 run load-tests/reveal-t0.k6.js
 */

const GUEST_COUNT = Number(__ENV.GUEST_COUNT || 80);
const TARGET_VUS = GUEST_COUNT * 2;
const BASE_URL = (__ENV.BASE_URL || '').replace(/\/+$/, '');

if (!BASE_URL) {
  throw new Error(
    'BASE_URL is required (staging URL only, e.g. BASE_URL=https://staging-preview.vercel.app).'
  );
}

if (
  BASE_URL.includes('basio-gender-reveal.vercel.app') &&
  __ENV.ALLOW_PROD !== 'I_UNDERSTAND'
) {
  throw new Error(
    'Refusing to load-test production URL! Point BASE_URL at your STAGING Vercel Preview URL.'
  );
}

export const options = {
  scenarios: {
    t0_thundering_herd: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1s', target: TARGET_VUS }, // Ramp to 2x guest count inside 3s window
        { duration: '2s', target: TARGET_VUS }, // Hold peak at T-0
        { duration: '3s', target: 0 },          // Wind down
      ],
      gracefulRampDown: '2s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],     // >= 99% valid responses
    http_req_duration: ['p(95)<3000'],  // p95 reveal fetch within 3s
    checks: ['rate>=0.99'],
  },
};

export default function () {
  // Simulate 0–1.5s client-side jitter at T-0
  sleep(Math.random() * 1.5);

  const res = http.get(`${BASE_URL}/api/state`, {
    headers: { Accept: 'application/json' },
    timeout: '8s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'valid JSON with serverTime': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Boolean(body && body.serverTime && body.revealTime);
      } catch {
        return false;
      }
    },
  });
}
