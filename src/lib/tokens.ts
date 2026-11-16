/**
 * Centralized Design Tokens — "Paper & Light" Editorial System
 * Strictly adheres to the project brief palette, typography, spacing, and motion easings.
 */

export type RevealGender = 'boy' | 'girl';
export type ThemeMode = 'neutral' | RevealGender;

export const PALETTE = {
  neutral: {
    paper: '#F4EEE3',   // oat paper, main background
    linen: '#FBF8F2',   // raised surfaces
    ink: '#26302B',     // deep green-black, main text
    fern: '#66745E',    // muted sage, secondary
    clay: '#C98A62',    // terracotta accent, buttons and highlights
    butter: '#E8CF92',  // soft gold, sparkle and stars
    fog: '#C9CEC6',     // hairlines and disabled
  },
  boy: {
    tide: '#4F7FA3',      // primary
    deepTide: '#1F3B52',  // dark surfaces and text
    mist: '#D5E2EA',      // soft background
    sand: '#EADBC0',      // warm contrast
  },
  girl: {
    peony: '#D4808F',     // primary
    mulberry: '#5E2A3F',  // dark surfaces and text
    petal: '#F0D2D0',     // soft background
    sand: '#EADBC0',      // warm contrast
  },
} as const;

export const THEME_CSS_VARS: Record<ThemeMode, Record<string, string>> = {
  neutral: {
    '--bg-primary': PALETTE.neutral.paper,
    '--bg-surface': PALETTE.neutral.linen,
    '--text-primary': PALETTE.neutral.ink,
    '--text-secondary': PALETTE.neutral.fern,
    '--accent-primary': PALETTE.neutral.clay,
    '--accent-warm': PALETTE.neutral.butter,
    '--border-hairline': PALETTE.neutral.fog,
  },
  boy: {
    '--bg-primary': PALETTE.boy.mist,
    '--bg-surface': PALETTE.neutral.linen,
    '--text-primary': PALETTE.boy.deepTide,
    '--text-secondary': PALETTE.boy.tide,
    '--accent-primary': PALETTE.boy.tide,
    '--accent-warm': PALETTE.boy.sand,
    '--border-hairline': '#B4C8D6',
  },
  girl: {
    '--bg-primary': PALETTE.girl.petal,
    '--bg-surface': PALETTE.neutral.linen,
    '--text-primary': PALETTE.girl.mulberry,
    '--text-secondary': '#874860',
    '--accent-primary': PALETTE.girl.peony,
    '--accent-warm': PALETTE.girl.sand,
    '--border-hairline': '#DFB9BE',
  },
};

export const EASINGS = {
  // Soft editorial cubic-beziers (never linear)
  editorialOut: [0.22, 1, 0.36, 1] as const,
  editorialInOut: [0.65, 0, 0.35, 1] as const,
  curtainWipe: [0.76, 0, 0.24, 1] as const,
  popOvershoot: [0.34, 1.56, 0.64, 1] as const,
  // Framer Motion spring configs
  springSoft: {
    type: 'spring' as const,
    stiffness: 240,
    damping: 24,
    mass: 0.9,
  },
  springTactile: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 22,
    mass: 0.7,
  },
  springFloat: {
    type: 'spring' as const,
    stiffness: 110,
    damping: 18,
    mass: 1.1,
  },
};

export const BALLOON_NEUTRAL_PALETTE = [
  {
    id: 'balloon-1',
    name: 'Warm Cream',
    fill: '#FBF8F2',
    shade: '#EAE1D3',
    highlight: '#FFFFFF',
    rim: '#D8CEBE',
    label: 'A whisper from Manila...',
  },
  {
    id: 'balloon-2',
    name: 'Soft Butter',
    fill: '#E8CF92',
    shade: '#D4B673',
    highlight: '#F7E9C6',
    rim: '#C5A763',
    label: 'Cebu is watching closely...',
  },
  {
    id: 'balloon-3',
    name: 'Terracotta Clay',
    fill: '#C98A62',
    shade: '#B0714A',
    highlight: '#DFAB89',
    rim: '#9F623C',
    label: 'Almost there, Ninongs & Ninangs...',
  },
  {
    id: 'balloon-4',
    name: 'Muted Fern',
    fill: '#66745E',
    shade: '#505D49',
    highlight: '#84937B',
    rim: '#45513F',
    label: 'Davao guesses are locked...',
  },
  {
    id: 'balloon-5',
    name: 'Oat Paper',
    fill: '#EFE6D5',
    shade: '#DCD0BA',
    highlight: '#FBF8F2',
    rim: '#C8B99E',
    label: 'Iloilo sends warm wishes...',
  },
  {
    id: 'balloon-6',
    name: 'Spiced Ochre',
    fill: '#D8A47F',
    shade: '#BF8A65',
    highlight: '#ECC2A4',
    rim: '#AD7955',
    label: 'Just one more before the secret...',
  },
] as const;

export function applyThemeVariables(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = THEME_CSS_VARS[mode];
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute('data-theme', mode);
}

/**
 * Detects whether the guest is on a constrained or low-end Android/mobile device
 * so we can automatically scale particle counts and preserve 60fps.
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  const conn = (
    navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const saveData = Boolean(conn?.saveData);
  const slowNet =
    conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';
  return cores <= 4 || memory <= 3 || saveData || slowNet;
}
