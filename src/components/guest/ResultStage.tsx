'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowCounterClockwise, Sparkle } from '@phosphor-icons/react';
import { EASINGS, PALETTE, RevealGender } from '@/lib/tokens';
import type { FamilySide } from '@/lib/serverStore';
import { soundManager, triggerHaptic } from '@/lib/sound';
import {
  PaperBalloonSvg,
  PaperOrnamentDivider,
  PaperStarSvg,
  WaxSealSvg,
} from '@/components/shared/PaperIllustrations';
import { TactileButton } from '@/components/shared/MotionPrimitives';

export interface ResultGuestEntry {
  name: string;
  relationship?: string;
  side?: FamilySide;
  guess?: RevealGender;
}

export interface ResultStageProps {
  gender: RevealGender;
  guestName: string;
  guestGuess: RevealGender | null;
  babySurname: string;
  coupleNames: string;
  tally: {
    boy: number;
    girl: number;
    total: number;
  };
  correctGuessers: string[];
  guestWall?: ResultGuestEntry[];
  onOpenPhotobooth: () => void;
  onReplayReveal: () => void;
}

function formatSideBadge(side?: FamilySide): string {
  if (side === 'mother') return "Jazzmine's Side";
  if (side === 'father') return "Ruhmshynne's Side";
  if (side === 'both') return 'Both Sides';
  return 'Family & Friends';
}

export function ResultStage({
  gender,
  guestName,
  guestGuess,
  babySurname,
  coupleNames,
  tally,
  correctGuessers,
  guestWall = [],
  onOpenPhotobooth,
  onReplayReveal,
}: ResultStageProps) {
  const isBoy = gender === 'boy';
  const guessedCorrectly = guestGuess !== null && guestGuess === gender;
  const [sideFilter, setSideFilter] = useState<'all' | FamilySide>('all');

  const primaryColor = isBoy ? PALETTE.boy.tide : PALETTE.girl.peony;
  const darkColor = isBoy ? PALETTE.boy.deepTide : PALETTE.girl.mulberry;

  // Build structured Honor Roll entries with full name, role to baby, and family side (no ranking numbers)
  const honorRollEntries = React.useMemo(() => {
    const rawList = [...correctGuessers];
    if (
      guessedCorrectly &&
      guestName &&
      !rawList.some((n) => n.toLowerCase().includes(guestName.toLowerCase()))
    ) {
      rawList.unshift(guestName);
    }

    return rawList.map((rawItem, idx) => {
      const parts = rawItem.split('·').map((s) => s.trim());
      const parsedName = parts[0] || rawItem;
      const parsedRole = parts[1] || '';

      const wallMatch = guestWall.find(
        (g) =>
          g.name.toLowerCase() === rawItem.toLowerCase() ||
          g.name.toLowerCase() === parsedName.toLowerCase()
      );

      const relationship = wallMatch?.relationship || parsedRole || 'Family & Friends';
      const side: FamilySide =
        wallMatch?.side ||
        (idx % 3 === 0 ? 'mother' : idx % 3 === 1 ? 'father' : 'both');

      const isCurrentGuest =
        Boolean(guestName) &&
        rawItem.toLowerCase().includes(guestName.toLowerCase());

      return {
        id: `${parsedName}-${idx}`,
        name: parsedName,
        relationship,
        side,
        isCurrentGuest,
      };
    });
  }, [correctGuessers, guessedCorrectly, guestName, guestWall]);

  const filteredHonorRoll =
    sideFilter === 'all'
      ? honorRollEntries
      : honorRollEntries.filter((e) => e.side === sideFilter);

  const motherCount = honorRollEntries.filter((e) => e.side === 'mother').length;
  const fatherCount = honorRollEntries.filter((e) => e.side === 'father').length;
  const bothCount = honorRollEntries.filter((e) => e.side === 'both').length;

  return (
    <section
      aria-label="Gender Reveal Result & Shoutouts"
      className="mx-auto w-full max-w-4xl space-y-8 py-4 sm:py-8"
    >
      {/* Main Announcement Keepsake Card */}
      <div className="paper-card-surface relative overflow-hidden rounded-[32px] px-5 py-10 sm:px-12 sm:py-14 text-center">
        <div className="mx-auto flex flex-col items-center space-y-6">
          {/* Living Floating Hero Balloon */}
          <div className="mx-auto flex items-center justify-center">
            <PaperBalloonSvg
              fill={primaryColor}
              shade={darkColor}
              highlight="#FFFFFF"
              rim={PALETTE.boy.sand}
              isHero
              animateTail
              size={118}
            />
          </div>

          {/* Strictly One-Line Announcement Badge */}
          <div className="flex justify-center w-full overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/90 px-5 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-primary)] shadow-2xs">
              THE ANNOUNCEMENT · BABY {babySurname.toUpperCase()}
            </span>
          </div>

          {/* Non-overlapping Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASINGS.editorialOut }}
            className="font-display-editorial text-5xl sm:text-7xl font-semibold leading-[1.08] tracking-tight text-[var(--text-primary)] pt-1"
          >
            {isBoy ? "It's a Boy" : "It's a Girl"}
          </motion.h1>

          {/* Time-Agnostic Warm Message (Works for Morning, Afternoon, or Evening) */}
          <p className="mx-auto max-w-lg text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
            {coupleNames} are overjoyed to welcome their little{' '}
            {isBoy ? 'son' : 'daughter'} into the world. Salamat sa pagmamahal at sa
            pagsama sa amin sa espesyal na araw na ito!
          </p>

          <PaperOrnamentDivider className="mx-auto max-w-xs" />

          {/* Personalized Guess Outcome Banner ("You guessed right" or "Lovely try") */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASINGS.editorialOut }}
            className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/75 p-5 space-y-2.5"
          >
            <div className="mx-auto flex justify-center">
              <WaxSealSvg
                color={primaryColor}
                rim={darkColor}
                size={44}
                label={isBoy ? 'B' : 'G'}
              />
            </div>

            <h2 className="font-display-editorial text-2xl text-[var(--text-primary)]">
              {guestGuess === null
                ? 'Welcome to the Celebration'
                : guessedCorrectly
                ? 'You guessed right'
                : 'Beautiful Attempt'}
            </h2>

            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {guestGuess === null
                ? `You joined just in time to celebrate Team ${isBoy ? 'Boy' : 'Girl'} with the family.`
                : guessedCorrectly
                ? `${
                    guestName || 'Friend'
                  }, your intuition was spot on! You called Team ${
                    isBoy ? 'Boy' : 'Girl'
                  } from the very beginning.`
                : `${
                    guestName || 'Friend'
                  }, you rooted for Team ${
                    guestGuess === 'boy' ? 'Boy' : 'Girl'
                  }—baby had a sweet surprise waiting for you!`}
            </p>
          </motion.div>

          {/* Primary CTA to Photobooth + Replay */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <TactileButton
              variant="primary"
              onClick={onOpenPhotobooth}
              className="px-7 py-3.5 text-base"
            >
              <Camera size={18} weight="light" />
              <span>Open Themed Photobooth</span>
            </TactileButton>

            <TactileButton variant="secondary" onClick={onReplayReveal}>
              <ArrowCounterClockwise size={16} weight="light" />
              <span>Replay Balloon Pop</span>
            </TactileButton>
          </div>
        </div>
      </div>

      {/* Editorial Commemorative Certificate: THE HONOR ROLL (Scrollable & Full Names, No Numbers) */}
      <div className="paper-card-surface relative overflow-hidden rounded-[32px] p-4 sm:p-8">
        <div className="relative rounded-[24px] border border-[var(--border-hairline)] bg-[var(--bg-primary)]/45 p-5 sm:p-8 space-y-6">
          {/* Corner Paper-Cut Star Ornaments */}
          <PaperStarSvg
            size={18}
            color={PALETTE.neutral.butter}
            className="pointer-events-none absolute top-3.5 left-3.5 opacity-80"
          />
          <PaperStarSvg
            size={18}
            color={PALETTE.neutral.butter}
            className="pointer-events-none absolute top-3.5 right-3.5 opacity-80"
          />
          <PaperStarSvg
            size={18}
            color={PALETTE.neutral.butter}
            className="pointer-events-none absolute bottom-3.5 left-3.5 opacity-80"
          />
          <PaperStarSvg
            size={18}
            color={PALETTE.neutral.butter}
            className="pointer-events-none absolute bottom-3.5 right-3.5 opacity-80"
          />

          {/* Certificate Header */}
          <div className="text-center space-y-2 border-b border-[var(--border-hairline)] pb-5">
            <div className="mx-auto flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-primary)]">
              <Sparkle size={14} weight="light" />
              <span>Commemorative Honor Roll · Team {isBoy ? 'Boy' : 'Girl'}</span>
              <Sparkle size={14} weight="light" />
            </div>

            <h3 className="font-display-editorial text-2xl sm:text-4xl text-[var(--text-primary)]">
              Family &amp; Friends Who Guessed Team {isBoy ? 'Boy' : 'Girl'}
            </h3>

            <p className="mx-auto max-w-md text-xs sm:text-sm text-[var(--text-secondary)]">
              Celebrating the {honorRollEntries.length} loved ones who predicted{' '}
              <strong className="text-[var(--text-primary)]">
                Team {isBoy ? 'Boy' : 'Girl'}
              </strong>{' '}
              for Baby {babySurname}.
            </p>

            {/* Final Tally Ribbon Pill */}
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium">
              <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-1 text-[var(--text-primary)]">
                Final Votes: {tally.boy} Team Boy · {tally.girl} Team Girl
              </span>
            </div>
          </div>

          {/* Symmetrical 2x2 / 4-Column Family Side Filter for the Honor Roll */}
          <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'all' as const, label: 'All Correct', count: honorRollEntries.length },
                { id: 'mother' as const, label: "Jazzmine's Side", count: motherCount },
                { id: 'father' as const, label: "Ruhmshynne's Side", count: fatherCount },
                { id: 'both' as const, label: 'Both Sides', count: bothCount },
              ] as const
            ).map((f) => {
              const active = sideFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    soundManager.play('tick', 1.05);
                    setSideFilter(f.id);
                  }}
                  className={`flex min-h-[38px] items-center justify-between rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--linen)] shadow-2xs'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/60 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Honor Roll Plaques Grid — Full Uncut Names & No Ranking Numbers */}
          <div className="max-h-[340px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredHonorRoll.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.25), duration: 0.3 }}
                  className={`flex flex-col justify-between gap-2.5 rounded-2xl border p-4 text-left transition ${
                    entry.isCurrentGuest
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--linen)] shadow-md'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)]'
                  }`}
                >
                  {/* Full Uncut Name + Star Emblem */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                          entry.isCurrentGuest
                            ? 'border-white/40 bg-white/15'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]'
                        }`}
                      >
                        <PaperStarSvg
                          size={14}
                          color={
                            entry.isCurrentGuest
                              ? '#FFFFFF'
                              : PALETTE.neutral.butter
                          }
                        />
                      </div>
                      <div>
                        <p className="font-display-editorial text-base sm:text-lg font-medium leading-snug break-words">
                          {entry.name}
                        </p>
                        <p
                          className={`text-xs ${
                            entry.isCurrentGuest
                              ? 'text-white/85'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {entry.relationship}
                        </p>
                      </div>
                    </div>

                    {entry.isCurrentGuest && (
                      <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        You
                      </span>
                    )}
                  </div>

                  {/* Family Side Badge */}
                  <div className="flex items-center justify-end border-t border-current/10 pt-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                        entry.isCurrentGuest
                          ? 'border-white/30 bg-white/15 text-white'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/80 text-[var(--text-secondary)]'
                      }`}
                    >
                      {formatSideBadge(entry.side)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredHonorRoll.length === 0 && (
              <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
                No correct guesses listed in this family side filter yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
