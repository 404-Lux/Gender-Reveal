'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  SpeakerHigh,
  SpeakerSlash,
  Sparkle,
  PaperPlaneTilt,
  WifiHigh,
  ArrowsClockwise,
  CalendarBlank,
  Clock,
} from '@phosphor-icons/react';
import { EASINGS, PALETTE } from '@/lib/tokens';
import { FamilySide } from '@/lib/serverStore';
import { CountdownBreakdown, getPhilippineDateParts } from '@/lib/time';
import { soundManager, triggerHaptic } from '@/lib/sound';
import { useWakeLock } from '@/lib/useWakeLock';
import {
  RollingNumber,
  SplitText,
  TactileButton,
} from '@/components/shared/MotionPrimitives';
import {
  PaperOrnamentDivider,
  PaperStarSvg,
} from '@/components/shared/PaperIllustrations';

export interface GuestWallItem {
  name: string;
  relationship?: string;
  side?: FamilySide;
  guess?: 'boy' | 'girl';
  timestamp: string;
}

export interface WaitingRoomStageProps {
  revealTimeIso: string;
  countdown: CountdownBreakdown;
  babySurname: string;
  coupleNames?: string;
  guestName: string;
  tally: {
    boy: number;
    girl: number;
    total: number;
  };
  sideCounts?: {
    all: number;
    mother: number;
    father: number;
    both: number;
  };
  guestWall: GuestWallItem[];
  namesList: Array<{ guest: string; suggested_name: string; timestamp: string }>;
  isReconnecting: boolean;
  onSubmitNameSuggestion: (suggestedName: string) => Promise<void>;
  onSubmitAdvice?: (advice: string) => Promise<void>;
  onTriggerDemoRevealNow?: () => void;
  onBackToCover?: () => void;
}

export function WaitingRoomStage({
  revealTimeIso,
  countdown,
  babySurname,
  guestName,
  tally,
  sideCounts,
  guestWall,
  namesList,
  isReconnecting,
  onSubmitNameSuggestion,
  onTriggerDemoRevealNow,
  onBackToCover,
}: WaitingRoomStageProps) {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  useWakeLock(true);
  const [activeTab, setActiveTab] = useState<'wall' | 'names'>('wall');
  const [sideFilter, setSideFilter] = useState<'all' | FamilySide>('all');

  const [suggestedName, setSuggestedName] = useState('');
  const [submittingName, setSubmittingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const namesCardRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const dateParts = getPhilippineDateParts(revealTimeIso);

  const handleOpenNameSuggestion = () => {
    triggerHaptic(14);
    soundManager.play('select');
    setActiveTab('names');
    setTimeout(() => {
      namesCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setTimeout(() => {
        nameInputRef.current?.focus({ preventScroll: true });
      }, 360);
    }, 50);
  };

  useEffect(() => {
    soundManager.preloadAll().then(() => {
      soundManager.startLullaby();
    });
    setIsMuted(soundManager.getMuted());
    return soundManager.subscribe((m) => setIsMuted(m));
  }, []);

  const handleToggleLullaby = () => {
    triggerHaptic(14);
    const nextMuted = soundManager.toggleMute();
    if (!nextMuted) {
      soundManager.startLullaby();
    } else {
      soundManager.stopLullaby();
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingName || suggestedName.trim().length < 2) return;
    setSubmittingName(true);
    setNameError(null);
    try {
      await onSubmitNameSuggestion(suggestedName.trim());
      setSuggestedName('');
      setNameSaved(true);
      soundManager.play('seal', 1.1);
      setTimeout(() => setNameSaved(false), 2600);
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : 'Could not save name right now. Tap Suggest Name to retry.'
      );
    } finally {
      setSubmittingName(false);
    }
  };

  const totalVotes = Math.max(1, tally.boy + tally.girl);
  const boyPct = Math.round((tally.boy / totalVotes) * 100);
  const girlPct = 100 - boyPct;

  const motherTotal =
    sideCounts?.mother ??
    guestWall.filter((g) => g.side === 'mother').length;
  const fatherTotal =
    sideCounts?.father ??
    guestWall.filter((g) => g.side === 'father').length;
  const bothTotal =
    sideCounts?.both ??
    guestWall.filter((g) => !g.side || g.side === 'both').length;
  const allTotal = sideCounts?.all ?? guestWall.length;

  const filteredGuests =
    sideFilter === 'all'
      ? guestWall
      : guestWall.filter((g) => (g.side || 'both') === sideFilter);

  return (
    <section
      aria-label="Waiting Room Gathering"
      className="mx-auto w-full max-w-2xl space-y-6 py-2 sm:py-6"
    >
      {/* Main Centered Countdown & Live Tally Card */}
      <div className="paper-card-surface mx-auto flex flex-col items-center rounded-[32px] px-5 py-8 sm:px-10 sm:py-10 text-center space-y-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-4 text-xs">
          <div className="flex items-center gap-2.5">
            {onBackToCover && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onBackToCover();
                }}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-3.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
              >
                <span>Back to Cover</span>
              </button>
            )}
            {isReconnecting ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--accent-primary)]">
                <ArrowsClockwise size={14} weight="light" className="animate-spin" />
                <span>Reconnecting...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                <WifiHigh size={14} weight="light" className="text-[var(--accent-primary)]" />
                <span>Synced Live</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleLullaby}
            aria-label={isMuted ? 'Unmute celebration music' : 'Mute celebration music'}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-3.5 py-1 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            {isMuted ? (
              <>
                <SpeakerSlash size={14} weight="light" />
                <span>Music Off</span>
              </>
            ) : (
              <>
                <SpeakerHigh size={14} weight="light" className="text-[var(--accent-primary)]" />
                <span>Party Music On</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col items-center space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            Waiting Room
          </span>
          <SplitText
            text={`Gathering for Baby ${babySurname}`}
            mode="words"
            className="font-display-editorial text-3xl sm:text-4xl text-[var(--text-primary)]"
          />
        </div>

        {/* Clean, Centered Date, Time & Countdown Box */}
        <div className="w-full rounded-[24px] border border-[var(--border-hairline)] bg-[var(--bg-primary)]/55 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <p className="font-display-editorial text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
              {dateParts.weekday}, {dateParts.monthLong} {dateParts.dayNumber}, {dateParts.year}
            </p>
            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1 text-xs font-medium text-[var(--text-primary)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank size={13} weight="light" className="text-[var(--accent-primary)]" />
                <span>{dateParts.monthShort} {dateParts.dayNumber}</span>
              </span>
              <span className="h-3 w-[1px] bg-[var(--border-hairline)]" />
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} weight="light" className="text-[var(--accent-primary)]" />
                <span>{dateParts.formattedTime}</span>
              </span>
            </div>
          </div>

          {/* 4 Symmetrical Countdown Tiles */}
          <div className="grid w-full grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Days', value: countdown.days },
              { label: 'Hours', value: countdown.hours },
              { label: 'Mins', value: countdown.minutes },
              { label: 'Secs', value: countdown.seconds },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] py-3 px-1.5 shadow-2xs"
              >
                <RollingNumber
                  value={item.value}
                  pad={2}
                  className="font-display-editorial text-2xl sm:text-4xl font-semibold text-[var(--text-primary)]"
                />
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <PaperOrnamentDivider />

        {/* Live Team Boy vs Team Girl Tally Bar */}
        <div className="w-full space-y-2.5">
          <div className="flex items-end justify-between">
            <div className="text-left">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Team Boy
              </span>
              <span className="font-display-editorial text-2xl text-[var(--text-primary)]">
                <RollingNumber value={tally.boy} pad={1} /> ({boyPct}%)
              </span>
            </div>

            <div className="text-right">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Team Girl
              </span>
              <span className="font-display-editorial text-2xl text-[var(--text-primary)]">
                <RollingNumber value={tally.girl} pad={1} /> ({girlPct}%)
              </span>
            </div>
          </div>

          <div className="flex h-4 w-full overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)] p-0.5">
            <motion.div
              initial={{ width: '50%' }}
              animate={{ width: `${boyPct}%` }}
              transition={{ duration: 0.7, ease: EASINGS.editorialOut }}
              style={{ backgroundColor: '#66745E' }}
              className="h-full rounded-l-full"
            />
            <motion.div
              initial={{ width: '50%' }}
              animate={{ width: `${girlPct}%` }}
              transition={{ duration: 0.7, ease: EASINGS.editorialOut }}
              style={{ backgroundColor: '#C98A62' }}
              className="h-full rounded-r-full"
            />
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center justify-center gap-2.5 pt-1">
          {onTriggerDemoRevealNow && (
            <TactileButton
              variant="primary"
              onClick={onTriggerDemoRevealNow}
              className="w-full"
            >
              <Sparkle size={16} weight="light" />
              <span>Launch Balloon Pop Reveal</span>
            </TactileButton>
          )}

          <TactileButton
            variant="secondary"
            onClick={handleOpenNameSuggestion}
            className="w-full"
          >
            <PaperPlaneTilt
              size={16}
              weight="light"
              className="text-[var(--accent-primary)]"
            />
            <span>Suggest a Name for Baby {babySurname}</span>
          </TactileButton>
        </div>
      </div>

      {/* Symmetrical 2-Tab Card: Family Joined | Baby Name Ideas */}
      <div
        ref={namesCardRef}
        className="paper-card-surface mx-auto flex flex-col items-center rounded-[32px] p-5 sm:p-8 text-center space-y-5"
      >
        <div className="grid w-full max-w-md grid-cols-2 gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 p-1">
          {(
            [
              { id: 'wall' as const, label: `Family Joined (${allTotal})` },
              { id: 'names' as const, label: `Name Ideas (${namesList.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setActiveTab(tab.id);
              }}
              className={`min-h-[38px] rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'bg-[var(--accent-primary)] text-[var(--linen)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: FAMILY JOINED — BALANCED 2x2 FILTER GRID + ORGANIZED 2-COLUMN GUEST GRID */}
        {activeTab === 'wall' && (
          <div className="w-full space-y-4">
            {/* Symmetrical 2x2 Grid on Mobile, 4-Column on Desktop */}
            <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'all' as const, label: 'All Guests', count: allTotal },
                  {
                    id: 'mother' as const,
                    label: "Jazzmine's Side",
                    count: motherTotal,
                  },
                  {
                    id: 'father' as const,
                    label: "Ruhmshynne's Side",
                    count: fatherTotal,
                  },
                  { id: 'both' as const, label: 'Both Sides', count: bothTotal },
                ] as const
              ).map((filterItem) => {
                const isSelected = sideFilter === filterItem.id;
                return (
                  <button
                    key={filterItem.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setSideFilter(filterItem.id);
                    }}
                    className={`flex min-h-[40px] items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      isSelected
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--linen)] shadow-2xs'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate">{filterItem.label}</span>
                    <span
                      className={`ml-1.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                      }`}
                    >
                      {filterItem.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Organized 2-Column Scrollable Guest Grid (Never Overwhelming) */}
            <div className="max-h-[280px] w-full overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredGuests.map((g, idx) => (
                  <div
                    key={`${g.name}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 px-3.5 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            g.guess === 'boy'
                              ? '#66745E'
                              : g.guess === 'girl'
                              ? '#C98A62'
                              : 'var(--accent-primary)',
                        }}
                      />
                      <div className="min-w-0">
                        <span className="block break-words font-display-editorial text-sm sm:text-base font-medium text-[var(--text-primary)] leading-snug">
                          {g.name}
                        </span>
                        {g.relationship && (
                          <span className="block break-words text-[10px] text-[var(--text-secondary)]">
                            {g.relationship}
                          </span>
                        )}
                      </div>
                    </div>

                    {g.guess && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          g.guess === 'boy'
                            ? 'bg-[#66745E]/15 text-[#495742]'
                            : 'bg-[#C98A62]/18 text-[#9E603B]'
                        }`}
                      >
                        Team {g.guess === 'boy' ? 'Boy' : 'Girl'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {filteredGuests.length === 0 && (
                <p className="py-6 text-xs text-[var(--text-secondary)]">
                  No guests listed in this filter yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BABY NAME SUGGESTIONS */}
        {activeTab === 'names' && (
          <div className="w-full space-y-5">
            <form
              onSubmit={handleNameSubmit}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                ref={nameInputRef}
                type="text"
                maxLength={30}
                value={suggestedName}
                onChange={(e) => setSuggestedName(e.target.value)}
                placeholder={`Suggest a first name for Baby ${babySurname}...`}
                className="flex-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/55 focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none"
              />
              <TactileButton
                type="submit"
                variant="primary"
                disabled={submittingName || suggestedName.trim().length < 2}
              >
                {submittingName ? (
                  <>
                    <ArrowsClockwise size={16} weight="light" className="animate-spin" />
                    <span>Saving Name...</span>
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt size={16} weight="light" />
                    <span>Suggest Name</span>
                  </>
                )}
              </TactileButton>
            </form>

            {submittingName && (
              <p className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <ArrowsClockwise size={13} weight="light" className="animate-spin text-[var(--accent-primary)]" />
                <span>Adding your baby name idea to the jar...</span>
              </p>
            )}

            {nameError && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--accent-primary)]"
              >
                {nameError}
              </p>
            )}

            {nameSaved && (
              <p className="text-xs font-medium text-[var(--accent-primary)]">
                Added to the name jar for Baby {babySurname}. Salamat, {guestName || 'kaibigan'}!
              </p>
            )}

            <div className="max-h-[260px] overflow-y-auto pr-1 grid grid-cols-1 gap-2 sm:grid-cols-2 text-left">
              {namesList.map((item, idx) => (
                <div
                  key={`${item.suggested_name}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/45 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <PaperStarSvg size={14} color={PALETTE.neutral.butter} />
                    <span className="font-display-editorial text-base text-[var(--text-primary)]">
                      {item.suggested_name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    by {item.guest}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
