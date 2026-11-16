'use client';

import { Howl, Howler } from 'howler';

type SoundKey =
  | 'lullaby'
  | 'swell'
  | 'pop'
  | 'heroPop'
  | 'tick'
  | 'seal'
  | 'shutter'
  | 'tap'
  | 'select';

/**
 * Generates a 44.1kHz 16-bit PCM WAV data URI with smooth envelopes and harmonic overtones.
 */
function createWavDataUri(
  durationSec: number,
  sampleFn: (t: number, duration: number) => number,
  sampleRate = 44100
): string {
  const numSamples = Math.floor(durationSec * sampleRate);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const raw = Math.max(-1, Math.min(1, sampleFn(t, durationSec)));
    view.setInt16(44 + i * 2, raw * 32767, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Bright, bouncy acoustic ukulele / marimba pluck with crisp attack and cheerful harmonic warmth
 */
function acousticPluck(t: number, freq: number, decay = 5.5): number {
  if (t < 0 || t > 1.2) return 0;
  const attack = Math.min(1, t * 180);
  const env = attack * Math.exp(-t * decay);
  const f1 = Math.sin(2 * Math.PI * freq * t);
  const f2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.42 * Math.exp(-t * 7);
  const f3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.18 * Math.exp(-t * 11);
  const transient = Math.sin(2 * Math.PI * freq * 5 * t) * 0.09 * Math.exp(-t * 35);
  return (f1 + f2 + f3 + transient) * env;
}

/**
 * Warm, bouncy upright pizzicato bass note
 */
function pizzBass(t: number, freq: number): number {
  if (t < 0 || t > 0.7) return 0;
  const attack = Math.min(1, t * 140);
  const env = attack * Math.exp(-t * 6.8);
  const sub = Math.sin(2 * Math.PI * freq * t);
  const body = Math.sin(2 * Math.PI * freq * 2 * t) * 0.35 * Math.exp(-t * 9);
  return (sub + body) * env;
}

/**
 * Sparkling glockenspiel / celesta chime for celebration highlights
 */
function celestaChime(t: number, freq: number, decay = 2.6): number {
  if (t < 0 || t > 2.2) return 0;
  const attack = Math.min(1, t * 110);
  const env = attack * Math.exp(-t * decay);
  const f1 = Math.sin(2 * Math.PI * freq * t);
  const f2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.26 * Math.exp(-t * 5);
  const f3 = Math.sin(2 * Math.PI * freq * 4 * t) * 0.08 * Math.exp(-t * 14);
  return (f1 + f2 + f3) * env;
}

class SoundManager {
  private howls: Partial<Record<SoundKey, Howl>> = {};
  private initialized = false;
  private isMuted = false; // Automatically ON by default
  private lullabyPlaying = true;
  private listeners: Set<(muted: boolean) => void> = new Set();
  private unlockBound = false;
  private globalClickBound = false;
  private lastExplicitSoundAt = 0;

  public preloadAll(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (this.initialized) return Promise.resolve();
    Howler.mute(this.isMuted);
    if (this.isMuted) {
      // Lazy-defer procedural WAV synthesis until the user unmutes
      this.bindGlobalButtonSound();
      return Promise.resolve();
    }
    this.initialized = true;

    // 1. Upbeat, Sunny, Joyful Celebration Groove (120 BPM · 8-Bar Seamless Loop = 16.0s)
    // Bright acoustic ukulele/marimba melody + bouncy pizzicato bass + glockenspiel sparkles + light shaker/woodblock pulse
    // Progression: | C maj | G maj | Am7 | F maj | C maj | G maj | F maj G maj | C maj |
    const beat = 0.25; // 16th/8th grid unit (0.25s = eighth note at 120 BPM; 1 bar = 8 units = 2.0s)

    // Note frequencies
    const N = {
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
    };

    // Bouncy syncopated melody & chord strums across 64 eighth-note steps (16.0 seconds)
    const leadEvents: Array<{ step: number; f: number; v: number }> = [
      // Bar 1 (C major - sunny bounce)
      { step: 0, f: N.E5, v: 0.9 }, { step: 0, f: N.G4, v: 0.5 },
      { step: 1, f: N.C5, v: 0.65 },
      { step: 2, f: N.D5, v: 0.8 },
      { step: 3, f: N.E5, v: 0.95 }, { step: 3, f: N.C5, v: 0.5 },
      { step: 5, f: N.G5, v: 0.95 },
      { step: 6, f: N.E5, v: 0.8 },
      { step: 7, f: N.C5, v: 0.7 },

      // Bar 2 (G major)
      { step: 8, f: N.D5, v: 0.9 }, { step: 8, f: N.B4, v: 0.55 },
      { step: 9, f: N.B4, v: 0.65 },
      { step: 10, f: N.C5, v: 0.8 },
      { step: 11, f: N.D5, v: 0.9 },
      { step: 13, f: N.G5, v: 0.9 },
      { step: 14, f: N.D5, v: 0.75 },
      { step: 15, f: N.B4, v: 0.7 },

      // Bar 3 (Am7)
      { step: 16, f: N.C5, v: 0.9 }, { step: 16, f: N.E4, v: 0.5 },
      { step: 17, f: N.A4, v: 0.65 },
      { step: 18, f: N.C5, v: 0.8 },
      { step: 19, f: N.E5, v: 0.95 },
      { step: 21, f: N.A5, v: 0.9 },
      { step: 22, f: N.G5, v: 0.85 },
      { step: 23, f: N.E5, v: 0.75 },

      // Bar 4 (F major -> G major pickup)
      { step: 24, f: N.F5, v: 0.9 }, { step: 24, f: N.A4, v: 0.55 },
      { step: 26, f: N.E5, v: 0.85 },
      { step: 27, f: N.C5, v: 0.8 },
      { step: 28, f: N.D5, v: 0.9 }, { step: 28, f: N.B4, v: 0.55 },
      { step: 30, f: N.E5, v: 0.85 },
      { step: 31, f: N.D5, v: 0.8 },

      // Bar 5 (C major - playful variation)
      { step: 32, f: N.E5, v: 0.95 }, { step: 32, f: N.C5, v: 0.55 },
      { step: 33, f: N.G4, v: 0.65 },
      { step: 34, f: N.E5, v: 0.85 },
      { step: 35, f: N.G5, v: 0.95 },
      { step: 37, f: N.A5, v: 0.9 },
      { step: 38, f: N.G5, v: 0.85 },
      { step: 39, f: N.E5, v: 0.75 },

      // Bar 6 (G major)
      { step: 40, f: N.D5, v: 0.9 }, { step: 40, f: N.G4, v: 0.55 },
      { step: 42, f: N.E5, v: 0.85 },
      { step: 43, f: N.D5, v: 0.9 },
      { step: 45, f: N.B4, v: 0.8 },
      { step: 46, f: N.C5, v: 0.8 },
      { step: 47, f: N.D5, v: 0.85 },

      // Bar 7 (F major -> G major turnaround)
      { step: 48, f: N.F5, v: 0.9 }, { step: 48, f: N.A4, v: 0.55 },
      { step: 49, f: N.E5, v: 0.8 },
      { step: 50, f: N.D5, v: 0.85 },
      { step: 51, f: N.C5, v: 0.85 },
      { step: 52, f: N.D5, v: 0.9 }, { step: 52, f: N.B4, v: 0.6 },
      { step: 54, f: N.E5, v: 0.9 },
      { step: 55, f: N.D5, v: 0.85 },

      // Bar 8 (C major happy resolution + upbeat pickup)
      { step: 56, f: N.C5, v: 1.0 }, { step: 56, f: N.E4, v: 0.6 }, { step: 56, f: N.G4, v: 0.6 },
      { step: 58, f: N.G4, v: 0.7 },
      { step: 59, f: N.C5, v: 0.8 },
      { step: 60, f: N.E5, v: 0.9 },
      { step: 62, f: N.D5, v: 0.8 },
      { step: 63, f: N.C5, v: 0.75 },
    ];

    // Bouncy Pizzicato Bassline (8 bars)
    const barRoots: Array<[number, number]> = [
      [N.C3, N.G3], // Bar 1: C
      [N.G3, N.D3], // Bar 2: G
      [N.A3, N.E3], // Bar 3: Am
      [N.F3, N.G3], // Bar 4: F -> G
      [N.C3, N.G3], // Bar 5: C
      [N.G3, N.D3], // Bar 6: G
      [N.F3, N.G3], // Bar 7: F -> G
      [N.C3, N.G3], // Bar 8: C
    ];

    const bassEvents: Array<{ step: number; f: number; v: number }> = [];
    barRoots.forEach(([root, fifth], barIdx) => {
      const base = barIdx * 8;
      bassEvents.push(
        { step: base + 0, f: root, v: 0.85 },
        { step: base + 3, f: fifth, v: 0.65 },
        { step: base + 4, f: fifth, v: 0.8 },
        { step: base + 6, f: root * 1.25, v: 0.6 }
      );
    });

    const lullabyUri = createWavDataUri(16.0, (t, dur) => {
      let sum = 0;

      // 1. Acoustic Ukulele / Marimba Lead & Chords
      for (const ev of leadEvents) {
        const dt = t - ev.step * beat;
        if (dt >= 0 && dt < 0.95) {
          sum += acousticPluck(dt, ev.f, 5.2) * ev.v * 0.42;
        }
      }

      // 2. Bouncy Pizzicato Upright Bass
      for (const bev of bassEvents) {
        const dt = t - bev.step * beat;
        if (dt >= 0 && dt < 0.65) {
          sum += pizzBass(dt, bev.f) * bev.v * 0.48;
        }
      }

      // 3. Light Joyful Woodblock / Clave Backbeat on beats 2 & 4 (steps 2, 6, 10, 14...)
      const stepFloat = t / beat;
      const stepIdx = Math.floor(stepFloat);
      const stepFrac = (t - stepIdx * beat);
      if (stepIdx % 4 === 2 && stepFrac < 0.06) {
        // Warm woodblock tap on backbeat
        sum += Math.sin(2 * Math.PI * 780 * stepFrac) * Math.exp(-stepFrac * 95) * 0.14;
      }

      const fade =
        t < 0.08 ? t / 0.08 : t > dur - 0.15 ? (dur - t) / 0.15 : 1;
      return sum * 0.55 * fade;
    });

    // 2. Crisp, Fun Balloon Pop + Bright Sparkle Twinkle
    const popUri = createWavDataUri(0.28, (t) => {
      const snapEnv = Math.exp(-t * 55);
      const bodyEnv = Math.exp(-t * 28);
      const sweepFreq = 340 * Math.exp(-t * 14) + 70;
      const bodyThump = Math.sin(2 * Math.PI * sweepFreq * t) * bodyEnv;
      const crispSnap = (Math.random() * 2 - 1) * snapEnv * 0.55;
      const sparkle =
        t > 0.02
          ? celestaChime(t - 0.02, 1046.5, 16) * 0.28 +
            celestaChime(t - 0.04, 1318.5, 18) * 0.24
          : 0;
      return (bodyThump * 0.65 + crispSnap + sparkle) * 0.85;
    });

    // 3. Grand Hero Balloon Pop + Joyful Fanfare Arpeggio & Sparkle
    const fanfareNotes = [
      261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98,
    ];
    const heroPopUri = createWavDataUri(2.6, (t) => {
      const popSound =
        t < 0.22
          ? (Math.sin(2 * Math.PI * (260 * Math.exp(-t * 12) + 60) * t) * 0.7 +
              (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.5) *
            Math.exp(-t * 18)
          : 0;

      let fanfareSum = 0;
      fanfareNotes.forEach((f, idx) => {
        const start = 0.05 + idx * 0.05;
        if (t >= start) {
          fanfareSum += celestaChime(t - start, f, 1.6) * 0.3;
        }
      });

      return Math.max(-0.98, Math.min(0.98, popSound * 0.85 + fanfareSum * 0.75));
    });

    // 4. Crisp Marimba Countdown Tick
    const tickUri = createWavDataUri(0.14, (t) => {
      return (
        acousticPluck(t, 659.25, 26) * 0.6 +
        acousticPluck(t, 1318.5, 38) * 0.28
      );
    });

    // 5. Upbeat Shimmering Chord Swell
    const swellUri = createWavDataUri(2.4, (t, dur) => {
      const env = Math.sin((Math.PI * t) / dur) * 0.32;
      return (
        (celestaChime(t, 261.63, 0.9) +
          celestaChime(t, 329.63, 0.9) +
          celestaChime(t, 392.0, 0.9) +
          celestaChime(t, 523.25, 0.9)) *
        0.26 *
        env
      );
    });

    // 6. Envelope Fold & Wax Seal Stamp (Paper brush + cheerful two-note chime)
    const sealUri = createWavDataUri(0.45, (t) => {
      const paperBrush =
        t < 0.16
          ? (Math.random() * 2 - 1) * Math.sin((Math.PI * t) / 0.16) * 0.12
          : 0;
      const chime1 = acousticPluck(t, 523.25, 9) * 0.48;
      const chime2 = t > 0.07 ? acousticPluck(t - 0.07, 783.99, 8) * 0.5 : 0;
      return paperBrush + chime1 + chime2;
    });

    // 7. Camera Shutter Click
    const shutterUri = createWavDataUri(0.14, (t) => {
      const click1 = t < 0.04 ? (Math.random() * 2 - 1) * Math.exp(-t * 95) : 0;
      const click2 =
        t >= 0.055
          ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.055) * 95) * 0.8
          : 0;
      return (click1 + click2) * 0.75;
    });

    // 8. Tactile Button Press Sound (Warm wooden marimba tap + crisp paper transient)
    const tapUri = createWavDataUri(0.095, (t) => {
      const body = acousticPluck(t, 587.33, 36) * 0.55;
      const overtone = acousticPluck(t, 1174.66, 48) * 0.25;
      const click = t < 0.015 ? (Math.random() * 2 - 1) * Math.exp(-t * 140) * 0.14 : 0;
      return (body + overtone + click) * 0.8;
    });

    // 9. Option / Filter / Tab Selection Sound (Cheerful two-note soft chime)
    const selectUri = createWavDataUri(0.16, (t) => {
      const n1 = acousticPluck(t, 523.25, 28) * 0.48;
      const n2 = t >= 0.035 ? acousticPluck(t - 0.035, 659.25, 24) * 0.52 : 0;
      return (n1 + n2) * 0.82;
    });

    this.howls.lullaby = new Howl({
      src: [lullabyUri],
      preload: true,
      loop: true,
      volume: 0.48,
    });
    this.howls.pop = new Howl({ src: [popUri], preload: true, volume: 0.82 });
    this.howls.heroPop = new Howl({
      src: [heroPopUri],
      preload: true,
      volume: 0.9,
    });
    this.howls.tick = new Howl({ src: [tickUri], preload: true, volume: 0.6 });
    this.howls.swell = new Howl({
      src: [swellUri],
      preload: true,
      volume: 0.52,
    });
    this.howls.seal = new Howl({ src: [sealUri], preload: true, volume: 0.68 });
    this.howls.shutter = new Howl({
      src: [shutterUri],
      preload: true,
      volume: 0.72,
    });
    this.howls.tap = new Howl({
      src: [tapUri],
      preload: true,
      volume: 0.58,
    });
    this.howls.select = new Howl({
      src: [selectUri],
      preload: true,
      volume: 0.62,
    });

    this.tryAutoStartLullaby();
    this.bindGlobalButtonSound();

    return Promise.resolve();
  }

  private bindGlobalButtonSound() {
    if (typeof window === 'undefined' || this.globalClickBound) return;
    this.globalClickBound = true;

    window.addEventListener(
      'click',
      (e: MouseEvent) => {
        if (this.isMuted) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const interactive = target.closest(
          'button, a[href], [role="button"], [role="tab"]'
        ) as HTMLElement | null;
        if (!interactive) return;
        if (
          (interactive as HTMLButtonElement).disabled ||
          interactive.getAttribute('aria-disabled') === 'true'
        ) {
          return;
        }

        // If a button handler already played a special sound (pop, seal, shutter, etc.) in this click, skip generic tap
        if (performance.now() - this.lastExplicitSoundAt < 65) {
          return;
        }

        const isSelectionOption =
          interactive.hasAttribute('aria-pressed') ||
          interactive.getAttribute('role') === 'tab' ||
          interactive.dataset.sound === 'select' ||
          interactive.className.includes('rounded-lg') ||
          interactive.className.includes('rounded-xl') ||
          interactive.className.includes('rounded-2xl');

        if (isSelectionOption) {
          this.play('select', 1.0);
        } else {
          this.play('tap', 1.0);
        }
      },
      { passive: true }
    );
  }

  private tryAutoStartLullaby() {
    if (typeof window === 'undefined') return;
    if (!this.isMuted && this.lullabyPlaying && this.howls.lullaby) {
      if (!this.howls.lullaby.playing()) {
        this.howls.lullaby.play();
      }
    }

    if (!this.unlockBound) {
      this.unlockBound = true;
      const resumeOnInteraction = () => {
        if (!this.isMuted && this.lullabyPlaying && this.howls.lullaby) {
          if (!this.howls.lullaby.playing()) {
            this.howls.lullaby.play();
          }
        }
        window.removeEventListener('pointerdown', resumeOnInteraction);
        window.removeEventListener('keydown', resumeOnInteraction);
      };
      window.addEventListener('pointerdown', resumeOnInteraction, {
        passive: true,
      });
      window.addEventListener('keydown', resumeOnInteraction, {
        passive: true,
      });
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    if (!this.initialized) this.preloadAll();
    this.isMuted = muted;
    Howler.mute(muted);
    if (!muted) {
      this.lullabyPlaying = true;
      if (this.howls.lullaby && !this.howls.lullaby.playing()) {
        this.howls.lullaby.play();
      }
    } else {
      this.howls.lullaby?.pause();
    }
    this.listeners.forEach((fn) => fn(this.isMuted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public startLullaby() {
    if (!this.initialized) this.preloadAll();
    this.lullabyPlaying = true;
    if (!this.isMuted && this.howls.lullaby && !this.howls.lullaby.playing()) {
      this.howls.lullaby.play();
    }
  }

  public stopLullaby() {
    this.lullabyPlaying = false;
    this.howls.lullaby?.pause();
  }

  public play(key: SoundKey, rate = 1.0) {
    if (!this.initialized) this.preloadAll();
    if (key !== 'tap' && key !== 'select' && typeof performance !== 'undefined') {
      this.lastExplicitSoundAt = performance.now();
    }
    if (this.isMuted) return;
    const sound = this.howls[key];
    if (!sound) return;
    const id = sound.play();
    if (rate !== 1.0) {
      sound.rate(rate, id);
    }
  }
}

export const soundManager = new SoundManager();

export function triggerHaptic(pattern: number | number[] = 18) {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore
    }
  }
}
