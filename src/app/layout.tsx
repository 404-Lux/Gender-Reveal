import type { Metadata, Viewport } from 'next';
import { Fraunces, Instrument_Sans, Caveat } from 'next/font/google';
import './globals.css';
import { PaperGrainOverlay } from '@/components/shared/PaperGrainOverlay';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

const rawSurname = process.env.NEXT_PUBLIC_BABY_SURNAME;
const babySurname =
  !rawSurname || rawSurname === 'Alonzo' ? 'Basio' : rawSurname;

const rawCouple = process.env.NEXT_PUBLIC_COUPLE_NAMES;
const coupleNames =
  !rawCouple || rawCouple.includes('Alonzo')
    ? 'Jazzmine & Ruhmshynne Basio'
    : rawCouple;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F4EEE3',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  title: 'Gender Reveal',
  description: `Join ${coupleNames} and family across the Philippines for a synced balloon-pop gender reveal, keepsake wishes, and themed photobooth.`,
  openGraph: {
    title: `Baby ${babySurname} — Virtual Gender Reveal`,
    description: `Cast your guess, fold a keepsake letter, and watch the synced balloon-pop reveal live with ${coupleNames}.`,
    type: 'website',
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Baby ${babySurname} — Virtual Gender Reveal`,
    description: `Join ${coupleNames} for a synced balloon-pop reveal.`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${caveat.variable}`}
    >
      <body className="antialiased selection:bg-[var(--accent-primary)]/20 selection:text-[var(--text-primary)]">
        <PaperGrainOverlay />
        {children}
      </body>
    </html>
  );
}
