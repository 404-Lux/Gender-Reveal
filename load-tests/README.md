# Reveal T-0 Load Test (Staging Only)

This load test simulates **2x** your expected guest count all hitting `/api/state` within a **3-second window at T-0** (with client-side `0–1.5s` jitter).

> **Important:** Run this **only** against your **Staging** Vercel Preview deployment—never against the live event URL.

## Prerequisites
Install [k6](https://k6.io/docs/get-started/installation/):
```bash
brew install k6
```

## Run Against Staging
Replace `GUEST_COUNT` with your expected guest count (defaults to `80`, which launches `160` virtual users):

```bash
BASE_URL=https://YOUR-STAGING-PREVIEW.vercel.app GUEST_COUNT=80 k6 run load-tests/reveal-t0.k6.js
```

## Pass Criteria
- `http_req_failed` `< 1%` (at least **99%** valid HTTP 200 JSON responses)
- `http_req_duration p(95)` `< 3000ms` (reveal data received within **3 seconds**)
