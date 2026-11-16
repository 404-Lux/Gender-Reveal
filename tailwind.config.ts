import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        linen: 'var(--linen)',
        ink: 'var(--ink)',
        fern: 'var(--fern)',
        clay: 'var(--clay)',
        butter: 'var(--butter)',
        fog: 'var(--fog)',
        tide: 'var(--tide)',
        'deep-tide': 'var(--deep-tide)',
        mist: 'var(--mist)',
        sand: 'var(--sand)',
        peony: 'var(--peony)',
        mulberry: 'var(--mulberry)',
        petal: 'var(--petal)',
        theme: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          accent: 'var(--accent-primary)',
          warm: 'var(--accent-warm)',
          border: 'var(--border-hairline)',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-instrument)', 'system-ui', 'sans-serif'],
        script: ['var(--font-caveat)', 'cursive'],
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
