'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  LockKey,
  EnvelopeOpen,
  BookBookmark,
  Lightning,
  CaretLeft,
  CaretRight,
  X,
  Check,
  ArrowLeft,
  Sparkle,
  CalendarBlank,
  SpeakerHigh,
  SpeakerSlash,
} from '@phosphor-icons/react';
import { EASINGS, PALETTE, RevealGender } from '@/lib/tokens';
import {
  buildPhtIsoFromParts,
  formatPhilippineTime,
  getNowPHTIso,
  getPhilippineDateParts,
} from '@/lib/time';
import { soundManager, triggerHaptic } from '@/lib/sound';
import {
  TeamPaperCardArt,
  WaxSealSvg,
  PaperOrnamentDivider,
  PaperStarSvg,
} from '@/components/shared/PaperIllustrations';
import {
  SplitText,
  TactileButton,
  RollingNumber,
} from '@/components/shared/MotionPrimitives';
import { CreatorBrandSignature } from '@/components/shared/CreatorBrandSignature';
import { InAppBrowserGuard } from '@/components/shared/InAppBrowserGuard';
import { exportMemoryBookPdf } from '@/lib/memoryBookPdf';
import {
  AdviceEntry,
  buildParentsStatePayload,
  getServerStore,
  GuessEntry,
  NameSuggestionEntry,
  saveClientStore,
  WishEntry,
} from '@/lib/serverStore';

interface ParentsDashboardData {
  serverTime: string;
  revealTime: string;
  locked: boolean;
  revealed: boolean;
  gender: RevealGender | null;
  tally: {
    boy: number;
    girl: number;
    total: number;
  };
  guesses: (GuessEntry & { _rowIndex?: number })[];
  wishes: (WishEntry & { _rowIndex?: number })[];
  names: (NameSuggestionEntry & { _rowIndex?: number })[];
  advice: AdviceEntry[];
  correctGuessers: string[];
}

type ParentsSectionTab = 'setup' | 'postbox' | 'summary';

const MONTHS = [
  { num: 1, short: 'JAN', long: 'January' },
  { num: 2, short: 'FEB', long: 'February' },
  { num: 3, short: 'MAR', long: 'March' },
  { num: 4, short: 'APR', long: 'April' },
  { num: 5, short: 'MAY', long: 'May' },
  { num: 6, short: 'JUN', long: 'June' },
  { num: 7, short: 'JUL', long: 'July' },
  { num: 8, short: 'AUG', long: 'August' },
  { num: 9, short: 'SEP', long: 'September' },
  { num: 10, short: 'OCT', long: 'October' },
  { num: 11, short: 'NOV', long: 'November' },
  { num: 12, short: 'DEC', long: 'December' },
] as const;

const MINUTE_PRESETS = [0, 15, 30, 45] as const;

function splitGraphemes(text: string): string[] {
  if (!text) return [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const Seg = (
      Intl as unknown as {
        Segmenter: new (
          locale: string,
          opts: { granularity: 'grapheme' }
        ) => { segment: (s: string) => Iterable<{ segment: string }> };
      }
    ).Segmenter;
    const segmenter = new Seg('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function sliceGraphemes(text: string, count: number): string {
  if (count <= 0) return '';
  return splitGraphemes(text).slice(0, count).join('');
}

export function ParentsDashboardClient({
  slug,
  babySurname = 'Basio',
  coupleNames = 'Jazzmine & Ruhmshynne Basio',
  isMockMode = false,
}: {
  slug: string;
  babySurname?: string;
  coupleNames?: string;
  isMockMode?: boolean;
}) {
  const [data, setData] = useState<ParentsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ParentsSectionTab>('setup');

  // Structured Editorial Date & Time Picker State (PHT)
  const [hasInitializedPicker, setHasInitializedPicker] = useState(false);
  const [pickYear, setPickYear] = useState<number>(2026);
  const [pickMonth, setPickMonth] = useState<number>(11);
  const [pickDay, setPickDay] = useState<number>(21);
  const [pickHour12, setPickHour12] = useState<number>(7);
  const [pickMinute, setPickMinute] = useState<number>(0);
  const [pickPeriod, setPickPeriod] = useState<'AM' | 'PM'>('PM');

  const [savingTime, setSavingTime] = useState(false);
  const [timeFeedback, setTimeFeedback] = useState<string | null>(null);
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  useEffect(() => {
    soundManager.preloadAll().then(() => {
      soundManager.startLullaby();
    });
    setIsMuted(soundManager.getMuted());
    return soundManager.subscribe((m) => setIsMuted(m));
  }, []);

  const handleToggleMusic = () => {
    triggerHaptic(14);
    const nextMuted = soundManager.toggleMute();
    if (!nextMuted) {
      soundManager.startLullaby();
    } else {
      soundManager.stopLullaby();
    }
  };

  // Gender Picker & Confirmation Modal State
  const [pendingGender, setPendingGender] = useState<RevealGender | null>(null);
  const [confirmStepOpen, setConfirmStepOpen] = useState(false);
  const [lockingGender, setLockingGender] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // Sealed Envelope Letter Reader Modal State & Postbox Filter
  const [postboxFilter, setPostboxFilter] = useState<'all' | 'boy' | 'girl'>(
    'all'
  );
  const [showHiddenEntries, setShowHiddenEntries] = useState(false);
  const [togglingHideKey, setTogglingHideKey] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [activeLetterIdx, setActiveLetterIdx] = useState<number | null>(null);
  const [envelopeAnimKey, setEnvelopeAnimKey] = useState<number>(0);
  const [typewriterChars, setTypewriterChars] = useState<number>(0);
  const wishesRef = useRef<WishEntry[]>([]);

  const syncPickerFromIso = useCallback((isoString: string) => {
    const parts = getPhilippineDateParts(isoString);
    setPickYear(parts.yearNumber);
    setPickMonth(parts.monthNumber);
    setPickDay(parts.dayNumber);
    setPickHour12(parts.hour12);
    setPickMinute(parts.minuteNumber);
    setPickPeriod(parts.period);
  }, []);

  const fetchParentsData = useCallback(async () => {
    try {
      const res = await fetch(`/api/parents?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = (await res.json()) as ParentsDashboardData;
      setData(json);
      wishesRef.current = json.wishes || [];
      if (!hasInitializedPicker) {
        syncPickerFromIso(json.revealTime);
        setHasInitializedPicker(true);
      }
    } catch {
      const localJson = buildParentsStatePayload() as ParentsDashboardData;
      setData(localJson);
      wishesRef.current = localJson.wishes || [];
      if (!hasInitializedPicker) {
        syncPickerFromIso(localJson.revealTime);
        setHasInitializedPicker(true);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, hasInitializedPicker, syncPickerFromIso]);

  useEffect(() => {
    fetchParentsData();
    const interval = setInterval(fetchParentsData, 5000);
    return () => clearInterval(interval);
  }, [fetchParentsData]);

  // Continuous 3D Envelope Unsealing + Rising Letter + Single-Run Typewriter Animation
  // IMPORTANT: Depends ONLY on `activeLetterIdx` and `envelopeAnimKey` so 5s polls never restart it!
  useEffect(() => {
    if (activeLetterIdx === null) return;
    const letter = wishesRef.current[activeLetterIdx];
    if (!letter) return;

    setTypewriterChars(0);

    const totalLen =
      letter.wish_for_baby.length + (letter.note_for_parents?.length || 0);

    const tSlideSound = setTimeout(() => {
      soundManager.play('tick', 0.94);
    }, 320);

    let typeTimer: NodeJS.Timeout | null = null;
    const tRead = setTimeout(() => {
      typeTimer = setInterval(() => {
        setTypewriterChars((prev) => {
          if (prev >= totalLen) {
            if (typeTimer) clearInterval(typeTimer);
            return totalLen;
          }
          return prev + 4;
        });
      }, 18);
    }, 580);

    return () => {
      clearTimeout(tSlideSound);
      clearTimeout(tRead);
      if (typeTimer) clearInterval(typeTimer);
    };
  }, [activeLetterIdx, envelopeAnimKey]);

  const previewIso = buildPhtIsoFromParts({
    year: pickYear,
    month: pickMonth,
    day: pickDay,
    hour12: pickHour12,
    minute: pickMinute,
    period: pickPeriod,
  });

  const previewParts = getPhilippineDateParts(previewIso);
  const maxDaysInMonth = new Date(pickYear, pickMonth, 0).getDate();

  const handleApplyPreset = (preset: 'in2min' | 'tonight7' | 'saturday7') => {
    triggerHaptic(12);
    setTimeFeedback(null);
    if (preset === 'in2min') {
      const targetIso = getNowPHTIso(Date.now() + 2 * 60 * 1000);
      syncPickerFromIso(targetIso);
    } else if (preset === 'tonight7') {
      const nowParts = getPhilippineDateParts(getNowPHTIso());
      setPickYear(nowParts.yearNumber);
      setPickMonth(nowParts.monthNumber);
      setPickDay(nowParts.dayNumber);
      setPickHour12(7);
      setPickMinute(0);
      setPickPeriod('PM');
    } else {
      syncPickerFromIso('2026-11-21T19:00:00+08:00');
    }
  };

  const formatRelativePht = (isoStr: string) => {
    const targetMs = new Date(isoStr).getTime();
    const diffMs = targetMs - Date.now();
    if (diffMs <= 0) {
      const minsAgo = Math.max(1, Math.round(Math.abs(diffMs) / 60000));
      return {
        label: `${minsAgo} minute${minsAgo === 1 ? '' : 's'} in the past`,
        isPast: true,
        isTooSoon: true,
      };
    }
    const totalMins = Math.round(diffMs / 60000);
    const isTooSoon = totalMins < 5;
    if (totalMins < 60) {
      return {
        label: `in ${totalMins} minute${totalMins === 1 ? '' : 's'}`,
        isPast: false,
        isTooSoon,
      };
    }
    const totalHours = Math.round(totalMins / 60);
    if (totalHours < 48) {
      return {
        label: `in ${totalHours} hour${totalHours === 1 ? '' : 's'}`,
        isPast: false,
        isTooSoon: false,
      };
    }
    const totalDays = Math.round(totalHours / 24);
    return {
      label: `in ${totalDays} day${totalDays === 1 ? '' : 's'}`,
      isPast: false,
      isTooSoon: false,
    };
  };

  const handleToggleHideEntry = async (
    tab: 'guesses' | 'wishes' | 'names',
    rowIndex: number | undefined,
    nextHidden: boolean
  ) => {
    const resolvedRow = rowIndex ?? 2;
    const key = `${tab}:${resolvedRow}`;
    setTogglingHideKey(key);
    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          action: 'toggleHideEntry',
          tab,
          rowIndex: resolvedRow,
          hidden: nextHidden,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        if (!isMockMode) {
          setLockError(
            json?.error || `Could not update visibility (HTTP ${res.status}).`
          );
          return;
        }
        throw new Error('Static host fallback');
      }
      if (json?.ok && json?.data) {
        setData(json.data);
        wishesRef.current = json.data.wishes || [];
      }
    } catch {
      if (!isMockMode) return;
      const store = getServerStore();
      const arr =
        tab === 'guesses'
          ? store.guesses
          : tab === 'wishes'
          ? store.wishes
          : store.names;
      const idx = resolvedRow - 2;
      if (idx >= 0 && idx < arr.length) {
        arr[idx].hidden = nextHidden;
        saveClientStore();
        const nextData = buildParentsStatePayload() as ParentsDashboardData;
        setData(nextData);
        wishesRef.current = nextData.wishes || [];
      }
    } finally {
      setTogglingHideKey(null);
    }
  };

  const handleRequestSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(12);
    setScheduleConfirmOpen(true);
  };

  const handleConfirmSaveRevealTime = async () => {
    setScheduleConfirmOpen(false);
    setSavingTime(true);
    setTimeFeedback(null);

    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          action: 'setRevealTime',
          revealTime: previewIso,
        }),
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
        soundManager.play('seal', 1.05);
        setTimeFeedback('Reveal schedule saved and synced for all guests.');
      }
    } catch {
      const store = getServerStore();
      store.settings.reveal_time = previewIso;
      saveClientStore();
      setData(buildParentsStatePayload() as ParentsDashboardData);
      soundManager.play('seal', 1.05);
      setTimeFeedback('Reveal schedule saved and synced for all guests.');
    } finally {
      setSavingTime(false);
    }
  };

  const startHoldRevealNow = () => {
    if (savingTime) return;
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    const startMs = Date.now();
    const durationMs = 1500;
    triggerHaptic(10);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setHoldProgress(pct);
      if (pct >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setHoldProgress(0);
        handleRevealNowOverride();
      }
    }, 30);
  };

  const cancelHoldRevealNow = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const handleRevealNowOverride = async () => {
    setSavingTime(true);
    setTimeFeedback(null);
    triggerHaptic([25, 40, 25]);
    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          action: 'revealNow',
        }),
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
        syncPickerFromIso(json.data.revealTime);
        soundManager.play('heroPop');
        setTimeFeedback(
          'Reveal Now triggered! All connected guests are entering the balloon pop sequence.'
        );
      }
    } catch {
      const store = getServerStore();
      store.settings.reveal_time = getNowPHTIso(Date.now() - 1000);
      if (!store.settings.gender) {
        store.settings.gender = 'girl';
        store.settings.locked = true;
      }
      saveClientStore();
      const nextData = buildParentsStatePayload() as ParentsDashboardData;
      setData(nextData);
      syncPickerFromIso(nextData.revealTime);
      soundManager.play('heroPop');
      setTimeFeedback(
        'Reveal Now triggered! All connected guests are entering the balloon pop sequence.'
      );
    } finally {
      setSavingTime(false);
    }
  };

  const handleConfirmGenderLock = async () => {
    if (!pendingGender) return;
    setLockingGender(true);
    setLockError(null);
    triggerHaptic([30, 50, 40]);

    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          action: 'setGender',
          gender: pendingGender,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        if (!isMockMode) {
          setLockError(
            json?.error ||
              `Server rejected lock (HTTP ${res.status}). Check PARENTS_SLUG in Apps Script Script Properties.`
          );
          return;
        }
        throw new Error('Static host fallback');
      }
      if (json?.data) {
        setData(json.data);
        soundManager.play('seal', 0.95);
        setConfirmStepOpen(false);
        setPendingGender(null);
      }
    } catch {
      if (!isMockMode) {
        setLockError(
          'Could not reach the server to lock the gender. Please check your connection and try again.'
        );
        return;
      }
      const store = getServerStore();
      store.settings.gender = pendingGender;
      store.settings.locked = true;
      saveClientStore();
      setData(buildParentsStatePayload() as ParentsDashboardData);
      soundManager.play('seal', 0.95);
      setConfirmStepOpen(false);
      setPendingGender(null);
    } finally {
      setLockingGender(false);
    }
  };

  const handleResetGenderLock = async () => {
    setLockingGender(true);
    setLockError(null);
    triggerHaptic(16);
    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          action: 'resetGenderLock',
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        if (!isMockMode) {
          setLockError(
            json?.error ||
              `Could not unlock gender (HTTP ${res.status}).`
          );
          return;
        }
        throw new Error('Static host fallback');
      }
      if (json?.ok && json?.data) {
        setData(json.data);
        soundManager.play('tick', 0.95);
      }
    } catch {
      if (!isMockMode) {
        setLockError('Could not reach the server to unlock. Please try again.');
        return;
      }
      const store = getServerStore();
      store.settings.gender = null;
      store.settings.locked = false;
      saveClientStore();
      setData(buildParentsStatePayload() as ParentsDashboardData);
    } finally {
      setLockingGender(false);
    }
  };

  const handleExportPdf = async () => {
    if (!data || exportingPdf) return;
    triggerHaptic(20);
    setExportingPdf(true);
    setPdfProgress(5);
    try {
      await exportMemoryBookPdf({
        babySurname,
        coupleNames,
        revealTimeIso: data.revealTime,
        revealedGender: data.gender,
        tally: data.tally,
        wishes: data.wishes.filter((w) => !w.hidden),
        names: data.names.filter((n) => !n.hidden),
        onProgress: (pct) => setPdfProgress(pct),
      });
    } finally {
      setExportingPdf(false);
      setPdfProgress(0);
    }
  };

  if (loading || !data) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-4xl items-center justify-center p-6 text-center">
        <p className="font-display-editorial text-2xl text-[var(--text-secondary)]">
          Opening the Parents&apos; Sanctuary...
        </p>
      </div>
    );
  }

  const activeLetter =
    activeLetterIdx !== null ? data.wishes[activeLetterIdx] : null;
  const activeLetterWishLen = activeLetter
    ? splitGraphemes(activeLetter.wish_for_baby).length
    : 0;
  const activeLetterNoteLen = activeLetter?.note_for_parents
    ? splitGraphemes(activeLetter.note_for_parents).length
    : 0;
  const activeLetterTotalLen = activeLetterWishLen + activeLetterNoteLen;

  const hiddenWishesCount = data.wishes.filter((w) => w.hidden).length;
  const hiddenNamesCount = data.names.filter((n) => n.hidden).length;
  const hiddenGuessesCount = data.guesses.filter((g) => g.hidden).length;
  const totalHiddenCount =
    hiddenWishesCount + hiddenNamesCount + hiddenGuessesCount;

  const filteredWishesWithIndex = data.wishes
    .map((w, originalIdx) => ({ wish: w, originalIdx }))
    .filter(({ wish }) => (showHiddenEntries ? true : !wish.hidden))
    .filter(({ wish }) =>
      postboxFilter === 'all' ? true : wish.guess === postboxFilter
    );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10 space-y-6">
      {/* Centered, Balanced Top Editorial Header */}
      <div className="flex flex-col items-center text-center gap-3.5 border-b border-[var(--border-hairline)] pb-6">
        <div className="flex flex-col items-center space-y-1.5">
          <span className="inline-flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/80 px-3.5 py-1 text-[10px] sm:text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-primary)]">
            Parents&apos; Sanctuary · Baby {babySurname}
          </span>
          <SplitText
            text={coupleNames}
            mode="words"
            className="font-display-editorial text-3xl sm:text-5xl text-[var(--text-primary)]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleMusic}
            aria-label={isMuted ? 'Unmute celebration music' : 'Mute celebration music'}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            {isMuted ? (
              <>
                <SpeakerSlash size={15} weight="light" />
                <span>Unmute Music</span>
              </>
            ) : (
              <>
                <SpeakerHigh size={15} weight="light" className="text-[var(--accent-primary)]" />
                <span>Music On</span>
              </>
            )}
          </button>

          <Link
            href="/"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            <ArrowLeft size={15} weight="light" />
            <span>View Guest Experience</span>
          </Link>

          <div className="flex flex-col items-center gap-1">
            <TactileButton
              variant="primary"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="min-h-[42px] px-5 py-2 text-xs"
            >
              <BookBookmark size={16} weight="light" />
              <span>
                {exportingPdf
                  ? `Exporting Memory Book (${pdfProgress}%)...`
                  : 'Export Memory Book PDF'}
              </span>
            </TactileButton>
            <span className="text-[10px] text-[var(--text-secondary)]">
              Best exported on a laptop or desktop browser
            </span>
          </div>
        </div>
      </div>

      <InAppBrowserGuard context="general" />

      {/* Sticky Segmented Studio Navigation */}
      <div className="sticky top-3 z-30 flex justify-center py-1">
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 p-1.5 shadow-2xs backdrop-blur-md">
          {(
            [
              {
                id: 'setup' as const,
                label: '1. Schedule & Lock',
                icon: Clock,
              },
              {
                id: 'postbox' as const,
                label: `2. Postbox (${data.wishes.length})`,
                icon: EnvelopeOpen,
              },
              {
                id: 'summary' as const,
                label: `3. Votes & Names (${data.tally.total})`,
                icon: Sparkle,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setActiveTab(tab.id);
                }}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium transition ${
                  isSelected
                    ? 'bg-[var(--accent-primary)] text-[var(--linen)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} weight="light" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= TAB 1: SCHEDULE & GENDER LOCK ================= */}
      {activeTab === 'setup' && (
        <motion.div
          key="tab-setup"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASINGS.editorialOut }}
          className="grid grid-cols-1 gap-7 lg:grid-cols-12"
        >
          {/* 1. Bespoke Paper & Light Date & Time Studio */}
          <section
            aria-label="Reveal Timer Setup"
            className="paper-card-surface rounded-[28px] p-6 sm:p-8 space-y-5 lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                <CalendarBlank size={16} weight="light" />
                <span>1. Reveal Date &amp; Time</span>
              </div>

              {/* Quick One-Tap Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('in2min')}
                  className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                >
                  In 2 Mins
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('tonight7')}
                  className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                >
                  Tonight 7 PM
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('saturday7')}
                  className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                >
                  Saturday 7 PM
                </button>
              </div>
            </div>

            <form onSubmit={handleRequestSaveSchedule} className="space-y-4">
              {/* Engraved Live Invitation Preview Plaque */}
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-[var(--accent-primary)]/45 bg-[var(--bg-primary)]/65 p-4">
                <PaperStarSvg
                  size={13}
                  color={PALETTE.neutral.butter}
                  className="pointer-events-none absolute top-2.5 right-2.5 opacity-80"
                />
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xs">
                    <span className="w-full bg-[var(--accent-primary)] py-0.5 text-center text-[8px] font-semibold uppercase tracking-[0.2em] text-[var(--linen)]">
                      {previewParts.monthShort}
                    </span>
                    <span className="font-display-editorial text-xl font-semibold leading-none text-[var(--text-primary)] pt-0.5">
                      {previewParts.dayNumber}
                    </span>
                    <span className="text-[8px] text-[var(--text-secondary)]">
                      {previewParts.year}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                      Guest Invitation Cover Preview
                    </span>
                    <p className="font-display-editorial text-lg sm:text-xl text-[var(--text-primary)]">
                      {previewParts.weekday}, {previewParts.monthLong}{' '}
                      {previewParts.dayNumber} · {previewParts.formattedTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Paper Calendar Pickers: Month, Day, Year */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/40 p-4 space-y-3">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Select Calendar Date
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
                  {MONTHS.map((m) => {
                    const active = pickMonth === m.num;
                    return (
                      <button
                        key={m.num}
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setPickMonth(m.num);
                        }}
                        className={`rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                          active
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--linen)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50'
                        }`}
                      >
                        {m.short}
                      </button>
                    );
                  })}
                </div>

                {/* Day Stepper & Year Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Day:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPickDay((d) => (d > 1 ? d - 1 : maxDaysInMonth))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
                    >
                      -
                    </button>
                    <span className="min-w-[36px] text-center font-display-editorial text-xl font-semibold text-[var(--text-primary)]">
                      {pickDay}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPickDay((d) => (d < maxDaysInMonth ? d + 1 : 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[2026, 2027].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setPickYear(yr)}
                        className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                          pickYear === yr
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--linen)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paper Clock Dial Pickers: Hour (1-12), Minute (00-59), AM/PM */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/40 p-4 space-y-3">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Select Reveal Time
                </span>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Hour (1–12 Stepper & Direct Input) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Hour:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Decrease hour"
                        onClick={() => {
                          triggerHaptic(8);
                          setPickHour12((h) => (h > 1 ? h - 1 : 12));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        aria-label="Reveal hour (1 to 12)"
                        value={pickHour12}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          if (isNaN(raw)) {
                            setPickHour12(12);
                          } else {
                            setPickHour12(Math.max(1, Math.min(12, raw)));
                          }
                        }}
                        className="h-8 w-12 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center font-display-editorial text-lg font-semibold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase hour"
                        onClick={() => {
                          triggerHaptic(8);
                          setPickHour12((h) => (h < 12 ? h + 1 : 1));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Exact Minutes (00–59 Stepper & Direct Input) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Min:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Decrease minute"
                        onClick={() => {
                          triggerHaptic(8);
                          setPickMinute((m) => (m > 0 ? m - 1 : 59));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        aria-label="Reveal minute (00 to 59)"
                        value={String(pickMinute).padStart(2, '0')}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          if (isNaN(raw)) {
                            setPickMinute(0);
                          } else {
                            setPickMinute(Math.max(0, Math.min(59, raw)));
                          }
                        }}
                        className="h-8 w-12 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center font-display-editorial text-lg font-semibold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase minute"
                        onClick={() => {
                          triggerHaptic(8);
                          setPickMinute((m) => (m < 59 ? m + 1 : 0));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* AM / PM */}
                  <div className="inline-flex rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5">
                    {(['AM', 'PM'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setPickPeriod(p);
                        }}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          pickPeriod === p
                            ? 'bg-[var(--text-primary)] text-[var(--linen)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {timeFeedback && (
                <p className="text-xs font-medium text-[var(--accent-primary)]">
                  {timeFeedback}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <TactileButton
                  type="submit"
                  variant="primary"
                  disabled={savingTime}
                >
                  <Check size={16} weight="light" />
                  <span>{savingTime ? 'Saving...' : 'Save Schedule'}</span>
                </TactileButton>

                <button
                  type="button"
                  disabled={savingTime}
                  onPointerDown={startHoldRevealNow}
                  onPointerUp={cancelHoldRevealNow}
                  onPointerLeave={cancelHoldRevealNow}
                  onPointerCancel={cancelHoldRevealNow}
                  className="relative inline-flex min-h-[48px] select-none items-center justify-center gap-2 overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)] disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    style={{ width: `${holdProgress}%` }}
                    className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--accent-primary)]/25 transition-none"
                  />
                  <Lightning size={16} weight="light" className="relative z-10" />
                  <span className="relative z-10">
                    {holdProgress > 0
                      ? 'Keep Holding...'
                      : 'Hold 1.5s: Reveal Now'}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {/* 2. Gender Picker (Server-Side Locked after first confirm) */}
          <section
            aria-label="Gender Picker and Server Lock"
            className="paper-card-surface rounded-[28px] p-6 sm:p-8 space-y-5 lg:col-span-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                  <LockKey size={16} weight="light" />
                  <span>2. Secret Gender Lock</span>
                </div>

                {data.locked && (
                  <span className="rounded-full bg-[var(--accent-primary)]/15 px-3 py-1 text-[11px] font-medium text-[var(--accent-primary)]">
                    Locked
                  </span>
                )}
              </div>

              {data.locked ? (
                /* LOCKED STATE: Never exposes the value before reveal time */
                <div className="my-auto flex flex-col items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 p-7 text-center space-y-4">
                  <WaxSealSvg size={58} label="B" />
                  <div className="space-y-1.5">
                    <h3 className="font-display-editorial text-2xl sm:text-3xl text-[var(--text-primary)]">
                      Gender locked in
                    </h3>
                    <p className="mx-auto max-w-sm text-xs leading-relaxed text-[var(--text-secondary)]">
                      {data.revealed && data.gender
                        ? `The reveal time has arrived! Revealed as Team ${
                            data.gender === 'boy' ? 'Boy' : 'Girl'
                          }.`
                        : 'Sealed safely on the server. To protect the surprise for Jazzmine & Ruhmshynne, the selection stays hidden until the countdown reaches zero.'}
                    </p>
                  </div>

                  {!data.revealed &&
                  Date.now() < new Date(data.revealTime).getTime() ? (
                    <button
                      type="button"
                      disabled={lockingGender}
                      onClick={handleResetGenderLock}
                      className="mt-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)] disabled:opacity-50"
                    >
                      {lockingGender ? 'Unlocking...' : 'Change Gender Selection'}
                    </button>
                  ) : (
                    <span className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Selection is permanently locked once reveal time arrives.
                    </span>
                  )}
                </div>
              ) : (
                /* UNLOCKED STATE: Two Illustrated Options -> Confirm Step ("This will be final") */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-display-editorial text-2xl sm:text-3xl text-[var(--text-primary)]">
                      Seal the Secret Answer
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                      For the doctor, baker, or trusted friend holding the envelope
                      for Baby {babySurname}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {(
                      [
                        { team: 'boy' as const, label: "It's a Boy" },
                        { team: 'girl' as const, label: "It's a Girl" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.team}
                        type="button"
                        onClick={() => {
                          triggerHaptic(18);
                          setPendingGender(opt.team);
                          setConfirmStepOpen(true);
                        }}
                        className="flex flex-col items-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 p-4 text-center transition hover:-translate-y-1 hover:border-[var(--accent-primary)]"
                      >
                        <TeamPaperCardArt team={opt.team} selected={false} />
                        <span className="mt-3 font-display-editorial text-xl text-[var(--text-primary)]">
                          {opt.label}
                        </span>
                        <span className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          Tap to lock
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </motion.div>
      )}

      {/* ================= TAB 2: KEEPSAKE POSTBOX (COMPACT, NO LONG SCROLL) ================= */}
      {activeTab === 'postbox' && (
        <motion.section
          key="tab-postbox"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASINGS.editorialOut }}
          aria-label="Sealed Wishes and Parent Letters"
          className="paper-card-surface rounded-[32px] p-5 sm:p-8 space-y-5"
        >
          <div className="flex flex-col items-center text-center space-y-2 border-b border-[var(--border-hairline)] pb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-primary)]">
              <EnvelopeOpen size={15} weight="light" />
              <span>Keepsake Postbox · {data.wishes.length} Sealed Envelopes</span>
            </span>
            <h2 className="font-display-editorial text-2xl sm:text-4xl text-[var(--text-primary)]">
              Letters for Baby {babySurname} &amp; Parents
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Tap any sealed envelope to break the wax seal and watch the letter
              unfold.
            </p>

            {/* Quick Team Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {(
                [
                  { id: 'all' as const, label: `All (${data.wishes.length})` },
                  {
                    id: 'boy' as const,
                    label: `Team Boy (${
                      data.wishes.filter((w) => w.guess === 'boy').length
                    })`,
                  },
                  {
                    id: 'girl' as const,
                    label: `Team Girl (${
                      data.wishes.filter((w) => w.guess === 'girl').length
                    })`,
                  },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPostboxFilter(f.id)}
                  className={`rounded-full border px-3.5 py-1 text-[11px] font-medium transition ${
                    postboxFilter === f.id
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--linen)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {totalHiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenEntries((v) => !v)}
                  className={`rounded-full border px-3.5 py-1 text-[11px] font-medium transition ${
                    showHiddenEntries
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {showHiddenEntries
                    ? `Hide Hidden (${hiddenWishesCount})`
                    : `Show Hidden (${hiddenWishesCount})`}
                </button>
              )}
            </div>
          </div>

          {/* Bounded Scrollable 2-Column Mobile / 3-Column Desktop Grid (Eliminates Long Scroll) */}
          <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredWishesWithIndex.map(({ wish, originalIdx }) => (
                <motion.button
                  key={`${wish.name}-${originalIdx}`}
                  type="button"
                  onClick={() => {
                    triggerHaptic(16);
                    soundManager.play('seal', 1.08);
                    setEnvelopeAnimKey((k) => k + 1);
                    setActiveLetterIdx(originalIdx);
                  }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 p-3.5 sm:p-4 text-center transition hover:border-[var(--accent-primary)]"
                >
                  <svg
                    viewBox="0 0 300 44"
                    fill="none"
                    className="w-full opacity-65 group-hover:opacity-100 transition-opacity"
                  >
                    <path
                      d="M4 2L150 38L296 2"
                      stroke="#C98A62"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="-mt-2 mb-1 flex items-center justify-center">
                    <WaxSealSvg
                      size={36}
                      label={
                        wish.guess ? wish.guess.charAt(0).toUpperCase() : 'B'
                      }
                    />
                  </div>

                  <div className="w-full space-y-0.5 border-t border-[var(--border-hairline)]/80 pt-2">
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      <span>No. {String(originalIdx + 1).padStart(2, '0')}</span>
                      {wish.flagged || wish.hidden ? (
                        <span className="font-semibold text-[var(--accent-primary)]">
                          {wish.hidden ? 'Hidden' : 'Flagged'}
                        </span>
                      ) : (
                        wish.guess && (
                          <span className="font-semibold text-[var(--accent-primary)]">
                            Team {wish.guess === 'boy' ? 'Boy' : 'Girl'}
                          </span>
                        )
                      )}
                    </div>
                    <p className="font-script-note text-lg sm:text-xl leading-tight text-[var(--text-primary)] line-clamp-1">
                      {wish.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      Tap to open
                    </p>
                  </div>
                </motion.button>
              ))}
              {totalHiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenEntries((v) => !v)}
                  className={`rounded-full border px-3.5 py-1 text-[11px] font-medium transition ${
                    showHiddenEntries
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {showHiddenEntries
                    ? `Hide Hidden (${hiddenWishesCount})`
                    : `Show Hidden (${hiddenWishesCount})`}
                </button>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* ================= TAB 3: VOTES & BABY NAME IDEAS (BALANCED & COMPACT) ================= */}
      {activeTab === 'summary' && (
        <motion.section
          key="tab-summary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASINGS.editorialOut }}
          aria-label="Guess Results and Baby Name Ideas"
          className="paper-card-surface rounded-[32px] p-5 sm:p-8 space-y-6"
        >
          {/* Centered Header (Fixes Lopsided Mobile Layout in Screenshot 1) */}
          <div className="flex flex-col items-center text-center space-y-1.5 border-b border-[var(--border-hairline)] pb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-primary)]">
              <Sparkle size={15} weight="light" />
              <span>Family Tally &amp; Baby Name Ideas</span>
            </span>
            <h2 className="font-display-editorial text-2xl sm:text-4xl text-[var(--text-primary)]">
              Team Boy vs Team Girl Totals
            </h2>
          </div>

          {/* Symmetrical 3-Column Row on Mobile & Desktop */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 p-3 sm:p-5 text-center">
              <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Team Boy
              </span>
              <p className="mt-1 font-display-editorial text-2xl sm:text-4xl text-[var(--text-primary)]">
                <RollingNumber value={data.tally.boy} pad={1} />
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 p-3 sm:p-5 text-center">
              <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Team Girl
              </span>
              <p className="mt-1 font-display-editorial text-2xl sm:text-4xl text-[var(--text-primary)]">
                <RollingNumber value={data.tally.girl} pad={1} />
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 p-3 sm:p-5 text-center">
              <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Total Joined
              </span>
              <p className="mt-1 font-display-editorial text-2xl sm:text-4xl text-[var(--text-primary)]">
                <RollingNumber value={data.tally.total} pad={1} />
              </p>
            </div>
          </div>

          {/* Suggested Baby Names Jar (Bounded Scrollable Container) */}
          <div className="space-y-3 border-t border-[var(--border-hairline)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display-editorial text-xl sm:text-2xl text-[var(--text-primary)]">
                Suggested Names for Baby {babySurname} ({data.names.length})
              </h3>
              {totalHiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenEntries((v) => !v)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    showHiddenEntries
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)]'
                  }`}
                >
                  {showHiddenEntries
                    ? 'Hide Flagged / Hidden'
                    : `Show Hidden (${hiddenNamesCount + hiddenGuessesCount})`}
                </button>
              )}
            </div>
            <div className="max-h-[250px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.names
                  .filter((item) => (showHiddenEntries ? true : !item.hidden))
                  .map((item, idx) => {
                    const rowIdx = item._rowIndex ?? idx + 2;
                    const toggleKey = `names:${rowIdx}`;
                    return (
                      <div
                        key={`${item.suggested_name}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 px-3.5 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <PaperStarSvg size={14} color={PALETTE.neutral.butter} />
                          <span className="truncate font-display-editorial text-base text-[var(--text-primary)]">
                            {item.suggested_name}
                          </span>
                          {(item.flagged || item.hidden) && (
                            <span className="shrink-0 rounded-full border border-[var(--accent-primary)]/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[var(--accent-primary)]">
                              {item.hidden ? 'Hidden' : 'Flagged'}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-[var(--text-secondary)]">
                            by {item.guest}
                          </span>
                          <button
                            type="button"
                            disabled={togglingHideKey === toggleKey}
                            onClick={() =>
                              handleToggleHideEntry('names', rowIdx, !item.hidden)
                            }
                            className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            {item.hidden ? 'Unhide' : 'Hide'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Guest Votes Moderation List */}
          {data.guesses.length > 0 && (
            <div className="space-y-3 border-t border-[var(--border-hairline)] pt-5">
              <h3 className="font-display-editorial text-lg sm:text-xl text-[var(--text-primary)]">
                Guest Wall Entries ({data.guesses.length})
              </h3>
              <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1.5">
                {data.guesses
                  .filter((g) => (showHiddenEntries ? true : !g.hidden))
                  .map((g, idx) => {
                    const rowIdx = g._rowIndex ?? idx + 2;
                    const toggleKey = `guesses:${rowIdx}`;
                    return (
                      <div
                        key={`${g.name}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/40 px-3 py-2 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            {g.name}
                          </span>
                          <span className="shrink-0 text-[var(--text-secondary)]">
                            Team {g.guess === 'boy' ? 'Boy' : 'Girl'}
                          </span>
                          {g.late && (
                            <span className="shrink-0 rounded-full border border-[var(--border-hairline)] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                              Late
                            </span>
                          )}
                          {(g.flagged || g.hidden) && (
                            <span className="shrink-0 rounded-full border border-[var(--accent-primary)]/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[var(--accent-primary)]">
                              {g.hidden ? 'Hidden' : 'Flagged'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={togglingHideKey === toggleKey}
                          onClick={() =>
                            handleToggleHideEntry('guesses', rowIdx, !g.hidden)
                          }
                          className="shrink-0 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                        >
                          {g.hidden ? 'Unhide' : 'Hide'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <PaperOrnamentDivider />

          {/* Correct Guessers Honor Roll */}
          {data.revealed && data.gender ? (
            <div className="space-y-3 text-center">
              <h3 className="font-display-editorial text-xl sm:text-2xl text-[var(--text-primary)]">
                Honor Roll · Correct Guessers ({data.correctGuessers.length})
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {data.correctGuessers.map((name, idx) => (
                  <span
                    key={`${name}-${idx}`}
                    className="rounded-full border border-[var(--accent-primary)] bg-[var(--bg-primary)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--text-secondary)]">
              The Honor Roll of correct guessers will appear here once the reveal
              countdown reaches zero.
            </p>
          )}
        </motion.section>
      )}

      {/* Save Schedule Confirmation Modal */}
      <AnimatePresence>
        {scheduleConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
            onClick={() => setScheduleConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="paper-card-surface w-full max-w-md rounded-3xl p-7 text-center space-y-5"
            >
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                  Confirm Reveal Schedule
                </span>
                <h3 className="font-display-editorial text-2xl sm:text-3xl text-[var(--text-primary)]">
                  {previewParts.weekday}, {previewParts.monthLong}{' '}
                  {previewParts.dayNumber} · {previewParts.formattedTime} PHT
                </h3>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Scheduled {formatRelativePht(previewIso).label}
                </p>

                {(formatRelativePht(previewIso).isPast ||
                  formatRelativePht(previewIso).isTooSoon) && (
                  <div className="mt-2 rounded-2xl border border-[var(--accent-primary)] bg-[var(--accent-primary)]/12 p-3 text-xs font-semibold text-[var(--text-primary)]">
                    {formatRelativePht(previewIso).isPast
                      ? 'WARNING: This time is in the PAST! Saving it will immediately trigger the reveal for all guests.'
                      : 'WARNING: This time is less than 5 minutes away. Make sure guests are ready before saving.'}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <TactileButton
                  variant="secondary"
                  onClick={() => setScheduleConfirmOpen(false)}
                >
                  <span>Cancel</span>
                </TactileButton>
                <TactileButton
                  variant="primary"
                  onClick={handleConfirmSaveRevealTime}
                >
                  <Check size={16} weight="light" />
                  <span>Confirm Schedule</span>
                </TactileButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Gender Lock Modal ("Confirm & Lock" strictly on one line) */}
      <AnimatePresence>
        {confirmStepOpen && pendingGender && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
            onClick={() => setConfirmStepOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="paper-card-surface w-full max-w-md rounded-3xl p-7 text-center space-y-5"
            >
              <div className="mx-auto flex justify-center">
                <WaxSealSvg
                  size={54}
                  label={pendingGender === 'boy' ? 'B' : 'G'}
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                  This will be final
                </span>
                <h3 className="font-display-editorial text-3xl text-[var(--text-primary)]">
                  Lock in &ldquo;
                  {pendingGender === 'boy' ? "It's a Boy" : "It's a Girl"}
                  &rdquo;?
                </h3>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  After confirming, the gender is locked server-side and cannot be
                  changed. The selection stays hidden until the reveal countdown
                  reaches zero.
                </p>
              </div>

              {lockError && (
                <p className="text-xs font-medium text-[var(--accent-primary)]">
                  {lockError}
                </p>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setConfirmStepOpen(false);
                    setPendingGender(null);
                  }}
                >
                  <span>Cancel</span>
                </TactileButton>
                <TactileButton
                  variant="primary"
                  disabled={lockingGender}
                  onClick={handleConfirmGenderLock}
                  className="whitespace-nowrap"
                >
                  <LockKey size={16} weight="light" />
                  <span className="whitespace-nowrap">
                    {lockingGender ? 'Locking...' : 'Confirm & Lock'}
                  </span>
                </TactileButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continuous 3D Envelope Unsealing & Rising Stationery Letter Modal */}
      <AnimatePresence>
        {activeLetter && activeLetterIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
            onClick={() => setActiveLetterIdx(null)}
          >
            <motion.div
              key={`letter-stage-${activeLetterIdx}-${envelopeAnimKey}`}
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: EASINGS.editorialOut }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto w-full max-w-lg pt-10 pb-2"
            >
              {/* 3D Animated Envelope Header / Flap Behind the Rising Letter */}
              <div
                className="pointer-events-none relative mx-auto -mb-12 w-[92%] max-w-[420px]"
                style={{ perspective: '900px' }}
              >
                {/* Envelope Back Lining */}
                <div className="h-16 w-full rounded-t-2xl border border-[var(--border-hairline)] bg-[#EAE1D3] shadow-inner" />

                {/* 3D Hinged Top Triangular Flap that Rotates Smoothly Open */}
                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: -176 }}
                  transition={{
                    duration: 0.65,
                    delay: 0.08,
                    ease: EASINGS.editorialOut,
                  }}
                  style={{
                    transformOrigin: 'top center',
                    transformStyle: 'preserve-3d',
                  }}
                  className="absolute inset-x-0 top-0 z-20"
                >
                  <svg
                    viewBox="0 0 420 95"
                    fill="none"
                    className="w-full drop-shadow-xs"
                  >
                    <path
                      d="M4 2 L210 88 L416 2 Z"
                      fill="#F4EEE3"
                      stroke="#C98A62"
                      strokeWidth="1.5"
                    />
                  </svg>
                </motion.div>

                {/* Wax Seal Popping & Dissolving as Flap Hinges Open */}
                <motion.div
                  initial={{ scale: 1, opacity: 1, y: 26 }}
                  animate={{ scale: 1.18, opacity: 0, y: -12 }}
                  transition={{ duration: 0.42, ease: EASINGS.editorialOut }}
                  className="absolute inset-x-0 top-0 z-30 flex justify-center"
                >
                  <WaxSealSvg
                    size={48}
                    label={
                      activeLetter.guess
                        ? activeLetter.guess.charAt(0).toUpperCase()
                        : 'B'
                    }
                  />
                </motion.div>
              </div>

              {/* Cream Stationery Letter Sheet Gliding Upward Out of the Envelope */}
              <motion.div
                initial={{ y: 54, scale: 0.94, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.62,
                  delay: 0.24,
                  ease: EASINGS.editorialOut,
                }}
                className="paper-card-surface relative z-10 w-full rounded-3xl p-5 sm:p-8 space-y-5 shadow-xl"
              >
                <button
                  type="button"
                  aria-label="Close letter"
                  onClick={() => setActiveLetterIdx(null)}
                  className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X size={19} weight="light" />
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3.5 pr-8">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Letter {activeLetterIdx + 1} of {data.wishes.length}
                    </span>
                    <h3 className="font-script-note text-2xl sm:text-3xl text-[var(--accent-primary)]">
                      From {activeLetter.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {typewriterChars < activeLetterTotalLen ? (
                      <button
                        type="button"
                        onClick={() =>
                          setTypewriterChars(activeLetterTotalLen)
                        }
                        className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Show All
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.play('seal', 1.05);
                          setEnvelopeAnimKey((k) => k + 1);
                        }}
                        className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Replay Unfold
                      </button>
                    )}

                    {activeLetter.guess && (
                      <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-primary)]">
                        Team {activeLetter.guess === 'boy' ? 'Boy' : 'Girl'}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={
                        togglingHideKey ===
                        `wishes:${activeLetter._rowIndex ?? activeLetterIdx + 2}`
                      }
                      onClick={() =>
                        handleToggleHideEntry(
                          'wishes',
                          activeLetter._rowIndex ?? activeLetterIdx + 2,
                          !activeLetter.hidden
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
                        activeLetter.hidden
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {togglingHideKey ===
                      `wishes:${activeLetter._rowIndex ?? activeLetterIdx + 2}`
                        ? activeLetter.hidden
                          ? 'Unhiding...'
                          : 'Hiding...'
                        : activeLetter.hidden
                        ? 'Unhide Wish'
                        : 'Hide Wish'}
                    </button>
                  </div>
                </div>

                {activeLetter.hidden && (
                  <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 px-3.5 py-2 text-left text-xs font-medium text-[var(--accent-primary)]">
                    This wish is currently hidden from the Postbox and Memory
                    Book PDF. Tap &ldquo;Unhide Wish&rdquo; above to restore it.
                  </div>
                )}

                {/* Typewriter Wish for Baby Basio */}
                <div className="space-y-1.5 text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    For Baby {babySurname}:
                  </p>
                  <p className="min-h-[76px] break-words font-display-editorial text-base sm:text-xl leading-relaxed text-[var(--text-primary)]">
                    &ldquo;
                    {sliceGraphemes(activeLetter.wish_for_baby, typewriterChars)}
                    &rdquo;
                  </p>
                </div>

                {/* Typewriter Personal Note for Jazzmine & Ruhmshynne Basio */}
                {activeLetter.note_for_parents && (
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 p-3.5 sm:p-4 text-left space-y-1">
                    <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--accent-primary)]">
                      Personal Note for {coupleNames}:
                    </p>
                    <p className="break-words text-xs sm:text-sm leading-relaxed text-[var(--text-primary)]">
                      {sliceGraphemes(
                        activeLetter.note_for_parents,
                        Math.max(0, typewriterChars - activeLetterWishLen)
                      )}
                    </p>
                  </div>
                )}

                {/* Letter Navigation Footer */}
                <div className="flex items-center justify-between border-t border-[var(--border-hairline)] pt-3.5">
                  <button
                    type="button"
                    disabled={activeLetterIdx === 0}
                    onClick={() => {
                      soundManager.play('seal', 0.95);
                      setEnvelopeAnimKey((k) => k + 1);
                      setActiveLetterIdx((prev) =>
                        prev !== null && prev > 0 ? prev - 1 : prev
                      );
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-[var(--border-hairline)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] disabled:opacity-40"
                  >
                    <CaretLeft size={14} weight="light" />
                    <span>Prev</span>
                  </button>

                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {formatPhilippineTime(activeLetter.timestamp, false)}
                  </span>

                  <button
                    type="button"
                    disabled={activeLetterIdx >= data.wishes.length - 1}
                    onClick={() => {
                      soundManager.play('seal', 1.1);
                      setEnvelopeAnimKey((k) => k + 1);
                      setActiveLetterIdx((prev) =>
                        prev !== null && prev < data.wishes.length - 1
                          ? prev + 1
                          : prev
                      );
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-[var(--border-hairline)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] disabled:opacity-40"
                  >
                    <span>Next</span>
                    <CaretRight size={14} weight="light" />
                  </button>
                </div>
              </motion.div>

              {/* Decorative Bottom Envelope Pocket Lip */}
              <div className="pointer-events-none mx-auto -mt-4 h-7 w-[92%] max-w-[420px] rounded-b-2xl border border-[var(--border-hairline)] bg-[#F4EEE3] shadow-sm" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parents Page Footer with Creator Brand Signature */}
      <footer className="pt-4 pb-8 text-center text-xs text-[var(--text-secondary)]">
        <div className="flex flex-col items-center justify-center gap-1 border-t border-[var(--border-hairline)] pt-5">
          <span className="font-display-editorial text-sm text-[var(--text-primary)]">
            With love, {coupleNames}
          </span>
          <span>Parents&apos; Private Sanctuary · Baby {babySurname}</span>
          <CreatorBrandSignature variant="footer" />
        </div>
      </footer>
    </main>
  );
}
