# Paper & Light — Virtual Gender Reveal Web App

A mobile-first, custom-crafted editorial virtual gender reveal experience designed for a couple whose family and friends are gathered remotely across the Philippines (Manila, Cebu, Davao, Iloilo, Baguio, Pampanga, Cagayan de Oro, and beyond).

## Architecture & Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Motion & Choreography**:
  - **Framer Motion**: Word/character mask split-text headlines, rolling countdown digits, tactile squash-and-spring buttons with touch ripple & desktop magnetic hover, curtain stage transitions, 3D tilting guess cards, envelope folding & wax-seal animations, and floating SVG reactions.
  - **GSAP**: Synced balloon wobble, squash-and-stretch pop physics, and slow-motion dramatic hero balloon tension beat.
- **Particles & Confetti**: `canvas-confetti` + custom SVG paper-and-latex shard particles (automatically scaled down on low-end Android devices and disabled when `prefers-reduced-motion` is active).
- **Audio & Haptics**: `Howler.js` (muted by default, with procedural zero-latency WAV buffers preloaded during the waiting room for the music-box lullaby, 10s warm swell, varied-pitch balloon pops, celebratory reveal chord, wax seal, and camera shutter) + `navigator.vibrate` haptics.
- **Database**: Google Sheets via Google Apps Script (`backend/Code.gs`) proxied through Next.js server routes (`/api/state`, `/api/guest`, `/api/parents`) so the script URL and shared secret are never exposed to the client.

## Key Routes
- `/` — Full 7-stage Guest Experience (**Welcome → Guess → Wishes → Waiting Room → Synced Balloon Pop Reveal → Result → Photobooth**) + Editorial Review Studio bar in `NEXT_PUBLIC_MOCK=true`.
- `/prototype` (or `/?view=prototype`) — Standalone **Balloon Pop Reveal & Theme Transformation Prototype** with interactive stage scrubber and Boy (`Tide`) / Girl (`Peony`) theme preview toggles.
- `/parents/[SECRET_SLUG]` (default in dev: `/parents/alonzo-secret-2026`) — Hidden `noindex` Parents Sanctuary with Philippine Standard Time (`Asia/Manila`) timer setup, "Reveal Now" override, one-time server-locked Gender Picker, interactive sealed envelope letters with paper-unfold & typewriter text, guess tallies, and multi-page Memory Book PDF export.
