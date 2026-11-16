'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Eye,
  LockKey,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react';
import {
  applyThemeVariables,
  RevealGender,
  ThemeMode,
} from '@/lib/tokens';
import {
  buildPublicStatePayload,
  FamilySide,
  getServerStore,
  saveClientStore,
} from '@/lib/serverStore';
import {
  getDefaultRevealTimePHT,
  getNowPHTIso,
  getSyncedCountdown,
} from '@/lib/time';
import { soundManager } from '@/lib/sound';
import { CurtainStageTransition } from '@/components/shared/MotionPrimitives';
import { CreatorBrandSignature } from '@/components/shared/CreatorBrandSignature';
import { InAppBrowserGuard } from '@/components/shared/InAppBrowserGuard';
import { WelcomeStage } from './WelcomeStage';
import { GuessStage } from './GuessStage';
import { WishesStage } from './WishesStage';
import { WaitingRoomStage } from './WaitingRoomStage';
import { ResultStage } from './ResultStage';
import { BalloonPopStage } from '@/components/reveal/BalloonPopStage';

const LazyPhotoboothStage = dynamic(
  () =>
    import('@/components/photobooth/PhotoboothStage').then(
      (mod) => mod.PhotoboothStage
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex min-h-[50dvh] max-w-xl items-center justify-center p-8 text-center">
        <p className="font-display-editorial text-2xl text-[var(--text-secondary)]">
          Preparing the photobooth frames...
        </p>
      </div>
    ),
  }
);

export type GuestFlowStage =
  | 'prototype'
  | 'welcome'
  | 'guess'
  | 'wishes'
  | 'waiting'
  | 'reveal'
  | 'result'
  | 'photobooth';

interface PolledPublicState {
  serverTime: string;
  revealTime: string;
  timeReached: boolean;
  revealed: boolean;
  locked: boolean;
  gender?: RevealGender;
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
  guestWall: Array<{
    name: string;
    relationship?: string;
    side?: FamilySide;
    timestamp: string;
    guess?: RevealGender;
  }>;
  names: Array<{ guest: string; suggested_name: string; timestamp: string }>;
  correctGuessers?: string[];
}

export function GenderRevealExperience({
  initialStage = 'welcome',
  babySurname = 'Basio',
  coupleNames = 'Jazzmine & Ruhmshynne Basio',
  isMockMode = false,
  parentsSecretSlug = 'basio-secret-2026',
}: {
  initialStage?: GuestFlowStage;
  babySurname?: string;
  coupleNames?: string;
  isMockMode?: boolean;
  parentsSecretSlug?: string;
}) {
  const [stage, setStage] = useState<GuestFlowStage>(initialStage);
  const [guestName, setGuestName] = useState<string>('');
  const [guestSide, setGuestSide] = useState<FamilySide | null>(null);
  const [guestRelationship, setGuestRelationship] = useState<string>('');
  const [guestGuess, setGuestGuess] = useState<RevealGender | null>(null);

  const [serverState, setServerState] = useState<PolledPublicState>({
    serverTime: new Date().toISOString(),
    revealTime: getDefaultRevealTimePHT(),
    timeReached: false,
    revealed: false,
    locked: false,
    tally: { boy: 4, girl: 5, total: 9 },
    sideCounts: { all: 9, mother: 4, father: 3, both: 2 },
    guestWall: [
      {
        name: 'Lola Teresita',
        relationship: 'Lola',
        side: 'mother',
        timestamp: '',
      },
      {
        name: 'Tito Jun & Tita Maricel',
        relationship: 'Tito & Tita',
        side: 'father',
        timestamp: '',
      },
      {
        name: 'Ninang Bea',
        relationship: 'Ninang',
        side: 'mother',
        timestamp: '',
      },
      {
        name: 'Ninong Carlo',
        relationship: 'Ninong',
        side: 'father',
        timestamp: '',
      },
      {
        name: 'Lolo Ernesto',
        relationship: 'Lolo',
        side: 'father',
        timestamp: '',
      },
      {
        name: 'Ate Camille',
        relationship: 'Tita',
        side: 'mother',
        timestamp: '',
      },
      {
        name: 'Kuya Miggy',
        relationship: 'Tito',
        side: 'father',
        timestamp: '',
      },
      {
        name: 'Tita Leni',
        relationship: 'Tita',
        side: 'both',
        timestamp: '',
      },
      {
        name: 'Trisha & Paolo',
        relationship: 'Family Friends',
        side: 'both',
        timestamp: '',
      },
    ],
    names: [
      { guest: 'Lola Teresita', suggested_name: 'Solana / Mateo Basio', timestamp: '' },
      { guest: 'Ninang Bea', suggested_name: 'Amara / Lucas Basio', timestamp: '' },
    ],
    correctGuessers: [],
  });

  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [nowClientMs, setNowClientMs] = useState<number>(Date.now());
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [isLateJoinReplay, setIsLateJoinReplay] = useState<boolean>(false);

  // Dev-only preview state (collapsed by default to prevent visual clutter)
  const [devPreviewGender, setDevPreviewGender] = useState<RevealGender>('girl');
  const [devThemeMode, setDevThemeMode] = useState<ThemeMode>('neutral');
  const [devReducedMotion, setDevReducedMotion] = useState<boolean>(false);
  const [devPanelOpen, setDevPanelOpen] = useState<boolean>(false);

  const failCountRef = useRef<number>(0);
  const hasAutoEnteredRevealRef = useRef<boolean>(false);
  const pendingPostRevealStageRef = useRef<GuestFlowStage | null>(null);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  // Automatically preload and start background lullaby music on mount
  useEffect(() => {
    soundManager.preloadAll();
    soundManager.startLullaby();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Restore cached serverState immediately so refresh never flashes default dates
      const cachedStateRaw = localStorage.getItem('pl_cached_public_state');
      let cachedRevealed = false;
      let cachedGender: RevealGender | undefined;
      if (cachedStateRaw) {
        try {
          const parsed = JSON.parse(cachedStateRaw) as PolledPublicState;
          if (parsed && parsed.revealTime) {
            setServerState(parsed);
            cachedRevealed = Boolean(parsed.revealed);
            cachedGender = parsed.gender;
          }
        } catch {
          // Ignore malformed cache
        }
      }

      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as GuestFlowStage | null;
      const validStages: GuestFlowStage[] = [
        'prototype',
        'welcome',
        'guess',
        'wishes',
        'waiting',
        'reveal',
        'result',
        'photobooth',
      ];

      const savedName = localStorage.getItem('pl_guest_name');
      const savedSide = localStorage.getItem('pl_guest_side') as FamilySide | null;
      const savedRel = localStorage.getItem('pl_guest_relationship');
      const savedGuess = localStorage.getItem('pl_guest_guess') as RevealGender | null;
      const savedStage = localStorage.getItem('pl_guest_stage') as GuestFlowStage | null;

      if (savedName) setGuestName(savedName);
      if (savedSide === 'mother' || savedSide === 'father' || savedSide === 'both') {
        setGuestSide(savedSide);
      }
      if (savedRel) setGuestRelationship(savedRel);
      if (savedGuess === 'boy' || savedGuess === 'girl') {
        setGuestGuess(savedGuess);
      }

      if (viewParam && validStages.includes(viewParam)) {
        setStage(viewParam);
      } else if (savedStage && validStages.includes(savedStage)) {
        if (
          savedStage === 'wishes' ||
          savedStage === 'waiting' ||
          savedStage === 'guess'
        ) {
          setStage(savedStage);
        } else if (
          savedStage === 'reveal' ||
          savedStage === 'result' ||
          savedStage === 'photobooth'
        ) {
          if (isMockMode || (cachedRevealed && cachedGender)) {
            if (
              cachedGender &&
              (savedStage === 'result' || savedStage === 'photobooth')
            ) {
              applyThemeVariables(cachedGender);
            }
            setStage(savedStage);
          } else {
            pendingPostRevealStageRef.current = savedStage;
            setStage('waiting');
          }
        }
      } else if (savedName && savedGuess) {
        // Guest already voted earlier — resume directly in Waiting Room
        setStage('waiting');
      }
    } catch {
      // Ignore
    } finally {
      setHasHydrated(true);
    }
  }, [isMockMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowClientMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = getSyncedCountdown(
    serverState.revealTime,
    serverOffsetMs,
    nowClientMs
  );

  const pollServerState = useCallback(async () => {
    try {
      const reqStart = Date.now();
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error('Status not OK');
      const data = (await res.json()) as PolledPublicState;

      const reqEnd = Date.now();
      const rttHalf = (reqEnd - reqStart) / 2;
      const serverEpoch = new Date(data.serverTime).getTime();
      if (!isNaN(serverEpoch)) {
        setServerOffsetMs(serverEpoch + rttHalf - reqEnd);
      }

      setServerState(data);
      try {
        localStorage.setItem('pl_cached_public_state', JSON.stringify(data));
      } catch {
        // Ignore
      }
      setIsReconnecting(false);
      failCountRef.current = 0;

      if (data.revealed && data.gender) {
        if (pendingPostRevealStageRef.current) {
          const target = pendingPostRevealStageRef.current;
          pendingPostRevealStageRef.current = null;
          if (target === 'result' || target === 'photobooth') {
            applyThemeVariables(data.gender);
          }
          setStage(target);
        } else if (!hasAutoEnteredRevealRef.current && stage === 'welcome') {
          hasAutoEnteredRevealRef.current = true;
          setIsLateJoinReplay(true);
        }
      }
    } catch {
      // Static host fallback (e.g. GitHub Pages): use client-side localStorage store seamlessly
      const localData = buildPublicStatePayload() as unknown as PolledPublicState;
      setServerState(localData);
      setIsReconnecting(false);
    }
  }, [stage]);

  useEffect(() => {
    pollServerState();
    const baseDelay =
      stage === 'reveal'
        ? 1500
        : countdown.isFinalMinute
        ? 2000
        : 4000;
    const backoffMultiplier = Math.min(4, Math.pow(1.5, failCountRef.current));
    const intervalMs = Math.round(baseDelay * backoffMultiplier);

    const timer = setInterval(pollServerState, intervalMs);
    return () => clearInterval(timer);
  }, [pollServerState, countdown.isFinalMinute, stage]);

  useEffect(() => {
    if (
      stage === 'waiting' &&
      (countdown.isFinalTenSeconds || countdown.isExpired) &&
      !hasAutoEnteredRevealRef.current
    ) {
      hasAutoEnteredRevealRef.current = true;
      setStage('reveal');
      try {
        localStorage.setItem('pl_guest_stage', 'reveal');
      } catch {
        // Ignore
      }
    }
  }, [stage, countdown.isFinalTenSeconds, countdown.isExpired]);

  const handleStageChange = (nextStage: GuestFlowStage) => {
    const isPostRevealStage =
      nextStage === 'reveal' ||
      nextStage === 'result' ||
      nextStage === 'photobooth' ||
      nextStage === 'prototype';
    if (!isMockMode && !serverState.revealed && isPostRevealStage) {
      return;
    }

    if (
      nextStage === 'welcome' ||
      nextStage === 'guess' ||
      nextStage === 'wishes' ||
      nextStage === 'waiting'
    ) {
      if (devThemeMode === 'neutral') {
        applyThemeVariables('neutral');
      }
    } else if (nextStage === 'result' || nextStage === 'photobooth') {
      const activeGender = serverState.gender || devPreviewGender;
      applyThemeVariables(activeGender);
    }
    setStage(nextStage);
    try {
      localStorage.setItem('pl_guest_stage', nextStage);
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleReducedMotion = () => {
    const next = !devReducedMotion;
    setDevReducedMotion(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-reduced-motion',
        next ? 'true' : 'false'
      );
    }
  };

  const handleGuessSubmit = async (payload: {
    name: string;
    side: FamilySide;
    relationship: string;
    guess: RevealGender;
  }) => {
    setGuestName(payload.name);
    setGuestSide(payload.side);
    setGuestRelationship(payload.relationship);
    setGuestGuess(payload.guess);

    try {
      localStorage.setItem('pl_guest_name', payload.name);
      localStorage.setItem('pl_guest_side', payload.side);
      localStorage.setItem('pl_guest_relationship', payload.relationship);
      localStorage.setItem('pl_guest_guess', payload.guess);
    } catch {
      // Ignore
    }

    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitGuess',
          name: payload.name,
          side: payload.side,
          relationship: payload.relationship,
          guess: payload.guess,
        }),
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = await res.json();
      if (json.state) setServerState(json.state);
    } catch {
      const store = getServerStore();
      store.guesses.push({
        name: payload.name,
        side: payload.side,
        relationship: payload.relationship,
        guess: payload.guess,
        timestamp: getNowPHTIso(),
      });
      saveClientStore();
      setServerState(buildPublicStatePayload() as unknown as PolledPublicState);
    }

    // Always let guests (including late guests) leave their wishes & parent notes after voting
    handleStageChange('wishes');
  };

  const handleWishSubmit = async (payload: {
    wishForBaby: string;
    noteForParents: string;
  }) => {
    const displaySender = guestRelationship
      ? `${guestName} · ${guestRelationship}`
      : guestName;
    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitWish',
          name: displaySender,
          guess: guestGuess,
          wish_for_baby: payload.wishForBaby,
          note_for_parents: payload.noteForParents,
        }),
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = await res.json();
      if (json.state) setServerState(json.state);
    } catch {
      const store = getServerStore();
      store.wishes.push({
        name: displaySender,
        guess: guestGuess || undefined,
        wish_for_baby: payload.wishForBaby,
        note_for_parents: payload.noteForParents,
        timestamp: getNowPHTIso(),
      });
      saveClientStore();
      setServerState(buildPublicStatePayload() as unknown as PolledPublicState);
    }
  };

  const handleNameSuggestionSubmit = async (suggestedName: string) => {
    const cleanGuest = guestName || 'Family Guest';
    const optimisticEntry = {
      guest: cleanGuest,
      suggested_name: suggestedName,
      timestamp: getNowPHTIso(),
    };

    // Optimistically show the name right away so slow mobile/Apps Script responses feel instant
    setServerState((prev) => ({
      ...prev,
      names: [optimisticEntry, ...prev.names],
    }));

    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitName',
          guest: cleanGuest,
          suggested_name: suggestedName,
        }),
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = await res.json();
      if (json.state) setServerState(json.state);
    } catch {
      const store = getServerStore();
      store.names.push(optimisticEntry);
      saveClientStore();
      setServerState(buildPublicStatePayload() as unknown as PolledPublicState);
    }
  };

  const handleAdviceSubmit = async (advice: string) => {
    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitAdvice',
          guest: guestName || 'Family Guest',
          advice,
        }),
      });
      if (!res.ok) throw new Error('Static host fallback');
      const json = await res.json();
      if (json.state) setServerState(json.state);
    } catch {
      const store = getServerStore();
      store.advice.push({
        guest: guestName || 'Family Guest',
        advice,
        timestamp: getNowPHTIso(),
      });
      saveClientStore();
      setServerState(buildPublicStatePayload() as unknown as PolledPublicState);
    }
  };

  const effectiveRevealedGender: RevealGender =
    serverState.gender || devPreviewGender;

  if (!hasHydrated) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <p className="font-display-editorial text-xl text-[var(--text-secondary)]">
          Preparing celebration...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col justify-between">
      {/* Prototype / Dev Step Navigation Bar (Hidden in Final Production Mode) */}
      {isMockMode && (
        <header className="mx-auto w-full max-w-3xl px-4 pt-5 pb-2">
          <nav
            aria-label="Celebration Steps"
            className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 px-3 py-1.5 shadow-2xs"
          >
            {(
              [
                { id: 'welcome', label: 'Cover' },
                { id: 'guess', label: 'Guess' },
                { id: 'wishes', label: 'Wishes' },
                { id: 'waiting', label: 'Waiting Room' },
                { id: 'reveal', label: 'Balloon Pop' },
                { id: 'result', label: 'Result' },
                { id: 'photobooth', label: 'Photobooth' },
              ] as const
            ).map((stepItem) => {
              const isActive =
                stage === stepItem.id ||
                (stage === 'prototype' && stepItem.id === 'reveal');
              const isPostRevealStep =
                stepItem.id === 'reveal' ||
                stepItem.id === 'result' ||
                stepItem.id === 'photobooth';
              const isLockedBeforeReveal =
                !isMockMode && !serverState.revealed && isPostRevealStep;

              return (
                <button
                  key={stepItem.id}
                  type="button"
                  disabled={isLockedBeforeReveal}
                  title={
                    isLockedBeforeReveal
                      ? 'Unlocks automatically at reveal time'
                      : undefined
                  }
                  onClick={() => handleStageChange(stepItem.id)}
                  className={`min-h-[34px] rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--linen)] shadow-2xs'
                      : isLockedBeforeReveal
                      ? 'cursor-not-allowed text-[var(--text-secondary)]/45'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {stepItem.label}
                </button>
              );
            })}
          </nav>
        </header>
      )}

      {/* Main Centered Stage Container */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4 sm:px-6 sm:py-6 space-y-4">
        <InAppBrowserGuard context="general" />
        <CurtainStageTransition stageKey={stage}>
          {/* PROTOTYPE / BALLOON POP REVEAL STAGE */}
          {(stage === 'prototype' || stage === 'reveal') && (
            <BalloonPopStage
              gender={
                serverState.gender || (isMockMode ? devPreviewGender : null)
              }
              babySurname={babySurname}
              isReplay={isLateJoinReplay}
              isPrototypeMode={isMockMode}
              onChangePreviewGender={
                isMockMode ? (g) => setDevPreviewGender(g) : undefined
              }
              onCompleteToResult={() => handleStageChange('result')}
              onOpenPhotobooth={() => handleStageChange('photobooth')}
            />
          )}

          {/* 1. WELCOME STAGE */}
          {stage === 'welcome' && (
            <WelcomeStage
              revealTimeIso={serverState.revealTime}
              countdown={countdown}
              coupleNames={coupleNames}
              babySurname={babySurname}
              tallyTotal={serverState.tally.total}
              onJoinCelebration={() => handleStageChange('guess')}
            />
          )}

          {/* 2. GUESS STAGE */}
          {stage === 'guess' && (
            <GuessStage
              initialName={guestName}
              initialSide={guestSide ?? undefined}
              initialRelationship={guestRelationship}
              initialGuess={guestGuess}
              babySurname={babySurname}
              onBack={() => handleStageChange('welcome')}
              onSubmitGuess={handleGuessSubmit}
            />
          )}

          {/* 3. WISHES STAGE */}
          {stage === 'wishes' && (
            <WishesStage
              guestName={guestName}
              guestGuess={guestGuess}
              babySurname={babySurname}
              coupleNames={coupleNames}
              isRevealReady={Boolean(serverState.revealed || isLateJoinReplay)}
              onBack={() => handleStageChange('guess')}
              onSkipToWaitingRoom={() =>
                handleStageChange(
                  serverState.revealed || isLateJoinReplay ? 'reveal' : 'waiting'
                )
              }
              onSubmitWish={handleWishSubmit}
            />
          )}

          {/* 4. WAITING ROOM STAGE */}
          {stage === 'waiting' && (
            <WaitingRoomStage
              revealTimeIso={serverState.revealTime}
              countdown={countdown}
              babySurname={babySurname}
              guestName={guestName}
              tally={serverState.tally}
              sideCounts={serverState.sideCounts}
              guestWall={serverState.guestWall}
              namesList={serverState.names}
              isReconnecting={isReconnecting}
              onSubmitNameSuggestion={handleNameSuggestionSubmit}
              onSubmitAdvice={handleAdviceSubmit}
              onTriggerDemoRevealNow={
                isMockMode ? () => handleStageChange('reveal') : undefined
              }
            />
          )}

          {/* 6. RESULT STAGE */}
          {stage === 'result' && (
            <ResultStage
              gender={effectiveRevealedGender}
              guestName={guestName}
              guestGuess={guestGuess}
              babySurname={babySurname}
              coupleNames={coupleNames}
              tally={serverState.tally}
              guestWall={serverState.guestWall}
              correctGuessers={
                serverState.correctGuessers &&
                serverState.correctGuessers.length > 0
                  ? serverState.correctGuessers
                  : serverState.guestWall
                      .filter((_, i) =>
                        effectiveRevealedGender === 'boy'
                          ? i % 2 === 1
                          : i % 2 === 0
                      )
                      .map((g) =>
                        g.relationship ? `${g.name} · ${g.relationship}` : g.name
                      )
              }
              onOpenPhotobooth={() => handleStageChange('photobooth')}
              onReplayReveal={() => handleStageChange('reveal')}
            />
          )}

          {/* 7. PHOTOBOOTH STAGE */}
          {stage === 'photobooth' && (
            <LazyPhotoboothStage
              gender={effectiveRevealedGender}
              guestName={guestName}
              babySurname={babySurname}
              isMockMode={isMockMode}
              onReplayReveal={() => handleStageChange('reveal')}
              onChangePreviewGender={
                isMockMode
                  ? (g) => {
                      setDevPreviewGender(g);
                      applyThemeVariables(g);
                    }
                  : undefined
              }
            />
          )}
        </CurtainStageTransition>
      </main>

      {/* Centered Editorial Footer (Extra bottom clearance on mobile so Dev Preview never overlaps) */}
      <footer className="mx-auto w-full max-w-3xl px-6 pt-6 pb-20 sm:pb-8 text-center text-xs text-[var(--text-secondary)]">
        <div className="flex flex-col items-center justify-center gap-1 border-t border-[var(--border-hairline)] pt-5">
          <span className="font-display-editorial text-sm text-[var(--text-primary)]">
            With love, {coupleNames}
          </span>
          <span>Celebrating Baby {babySurname} with Family &amp; Friends</span>
          <CreatorBrandSignature variant="footer" />
        </div>
      </footer>

      {/* Unobtrusive Floating Dev Preview Pill in Bottom-Right (Only in Mock Mode) */}
      {isMockMode && (
        <div className="fixed bottom-4 right-4 z-40">
          {!devPanelOpen ? (
            <button
              type="button"
              onClick={() => setDevPanelOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--linen)] shadow-lg transition hover:scale-105"
            >
              <SlidersHorizontal size={14} weight="light" />
              <span>Dev Preview</span>
            </button>
          ) : (
            <div className="paper-card-surface w-72 rounded-2xl p-4 shadow-xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-2">
                <span className="font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Dev Preview Controls
                </span>
                <button
                  type="button"
                  onClick={() => setDevPanelOpen(false)}
                  className="rounded-full p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X size={15} weight="light" />
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                  <Eye size={13} weight="light" />
                  <span>Theme Palette Preview</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { mode: 'neutral' as const, label: 'Neutral' },
                      { mode: 'boy' as const, label: 'Boy' },
                      { mode: 'girl' as const, label: 'Girl' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.mode}
                      type="button"
                      onClick={() => {
                        setDevThemeMode(t.mode);
                        if (t.mode === 'boy' || t.mode === 'girl') {
                          setDevPreviewGender(t.mode);
                        }
                        applyThemeVariables(t.mode);
                      }}
                      className={`rounded-lg py-1.5 font-medium transition ${
                        devThemeMode === t.mode
                          ? 'bg-[var(--accent-primary)] text-[var(--linen)]'
                          : 'border border-[var(--border-hairline)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleToggleReducedMotion}
                  className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-primary)] px-3 py-1.5 font-medium text-[var(--text-primary)]"
                >
                  {devReducedMotion ? 'Motion: Reduced' : 'Motion: Full'}
                </button>

                <Link
                  href={`/parents/${parentsSecretSlug}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 font-medium text-[var(--linen)]"
                >
                  <LockKey size={13} weight="light" />
                  <span>Parents Page</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
