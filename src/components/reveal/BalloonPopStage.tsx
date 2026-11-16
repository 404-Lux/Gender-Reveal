'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import {
  SpeakerHigh,
  SpeakerSlash,
  ArrowCounterClockwise,
  Sparkle,
  HandTap,
  ArrowRight,
  Camera,
} from '@phosphor-icons/react';
import {
  BALLOON_NEUTRAL_PALETTE,
  EASINGS,
  PALETTE,
  RevealGender,
  applyThemeVariables,
  isLowEndDevice,
} from '@/lib/tokens';
import { soundManager, triggerHaptic } from '@/lib/sound';
import { useWakeLock } from '@/lib/useWakeLock';
import {
  PaperBalloonSvg,
  PaperOrnamentDivider,
  ReactionParticleSvg,
} from '@/components/shared/PaperIllustrations';
import {
  SplitText,
  RollingNumber,
  TactileButton,
} from '@/components/shared/MotionPrimitives';

export type RevealSequenceStep =
  | 'countdown10'
  | 'hero'
  | 'celebration'
  | 'shy';

interface RisingBalloon {
  id: string;
  laneX: number;
  swayAmp: number;
  size: number;
  duration: number;
  fill: string;
  shade: string;
  highlight: string;
  rim: string;
}

interface BurstEffect {
  id: string;
  x: number;
  y: number;
  primaryColor: string;
  secondaryColor: string;
  label?: string;
  particles: Array<{
    angle: number;
    distance: number;
    size: number;
    rot: number;
    color: string;
    isCircle: boolean;
  }>;
}

interface FloatingReaction {
  id: string;
  kind: 'heart' | 'star' | 'balloon' | 'bow';
  x: number;
  sway: number;
  color: string;
  size: number;
  duration: number;
}

const POP_WORDS = [
  'Pop!',
  'Nice!',
  'Malapit na!',
  'Boy or Girl?',
  'Exciting!',
  'Keep popping!',
];

export interface BalloonPopStageProps {
  gender: RevealGender | null;
  babySurname?: string;
  isReplay?: boolean;
  isPrototypeMode?: boolean;
  onChangePreviewGender?: (g: RevealGender) => void;
  onCompleteToResult?: () => void;
  onOpenPhotobooth?: () => void;
}

export function BalloonPopStage({
  gender,
  babySurname = 'Basio',
  isPrototypeMode = false,
  onChangePreviewGender,
  onCompleteToResult,
  onOpenPhotobooth,
}: BalloonPopStageProps) {
  const prefersReduced = useReducedMotion();
  useWakeLock(true);
  const effectiveGender: RevealGender = gender || 'girl';

  const [step, setStep] = useState<RevealSequenceStep>('countdown10');
  const [secondsLeft, setSecondsLeft] = useState<number>(10);
  const latestGenderRef = useRef<RevealGender | null>(gender);
  latestGenderRef.current = gender;
  const [risingBalloons, setRisingBalloons] = useState<RisingBalloon[]>([]);
  const [poppedScore, setPoppedScore] = useState<number>(0);

  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [heroPoppingBeat, setHeroPoppingBeat] = useState(false);
  const [washOrigin, setWashOrigin] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [washActive, setWashActive] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [autoPopCountdown, setAutoPopCountdown] = useState<number>(8);

  const stageRef = useRef<HTMLDivElement>(null);
  const heroBalloonRef = useRef<HTMLButtonElement | null>(null);
  const laneCounterRef = useRef<number>(0);

  useEffect(() => {
    soundManager.preloadAll().then(() => {
      soundManager.startLullaby();
    });
    setIsMuted(soundManager.getMuted());
    return soundManager.subscribe((m) => setIsMuted(m));
  }, []);

  useEffect(() => {
    if (step === 'shy' && gender) {
      setStep('hero');
    }
  }, [gender, step]);

  const triggerBalloonBurstEffect = useCallback(
    (
      clientX: number,
      clientY: number,
      primaryColor: string,
      secondaryColor: string,
      label?: string,
      withConfetti = false
    ) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      if (withConfetti && !prefersReduced) {
        try {
          const normX = Math.max(
            0.1,
            Math.min(0.9, clientX / window.innerWidth)
          );
          const normY = Math.max(
            0.1,
            Math.min(0.9, clientY / window.innerHeight)
          );
          confetti({
            particleCount: isLowEndDevice() ? 10 : 18,
            spread: 60,
            startVelocity: 20,
            gravity: 0.9,
            scalar: 0.8,
            ticks: 85,
            origin: { x: normX, y: normY },
            colors: [primaryColor, secondaryColor, '#E8CF92', '#FBF8F2'],
          });
        } catch {
          // Ignore
        }
      }

      const count = isLowEndDevice() ? 6 : 8;
      const particles = Array.from({ length: count }).map((_, idx) => {
        const angle = (Math.PI * 2 * idx) / count;
        return {
          angle,
          distance: 42 + (idx % 3) * 18,
          size: 6 + (idx % 2) * 3,
          rot: idx * 45,
          color:
            idx % 3 === 0
              ? primaryColor
              : idx % 3 === 1
              ? secondaryColor
              : '#E8CF92',
          isCircle: idx % 2 === 0,
        };
      });

      const burstId = `${Date.now()}-${Math.random()}`;
      setBursts((prev) => [
        ...prev.slice(-5),
        {
          id: burstId,
          x: localX,
          y: localY,
          primaryColor,
          secondaryColor,
          label,
          particles,
        },
      ]);

      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burstId));
      }, 720);
    },
    [prefersReduced]
  );

  const fireRevealConfetti = useCallback(
    (targetGender: RevealGender) => {
      if (prefersReduced) return;
      const lowEnd = isLowEndDevice();
      const colors =
        targetGender === 'boy'
          ? [
              PALETTE.boy.tide,
              PALETTE.boy.deepTide,
              PALETTE.boy.mist,
              PALETTE.boy.sand,
            ]
          : [
              PALETTE.girl.peony,
              PALETTE.girl.mulberry,
              PALETTE.girl.petal,
              PALETTE.girl.sand,
            ];

      try {
        confetti({
          particleCount: lowEnd ? 45 : 95,
          spread: 85,
          startVelocity: 38,
          origin: { x: 0.5, y: 0.5 },
          colors,
          scalar: 1.1,
          ticks: 240,
        });

        setTimeout(() => {
          confetti({
            particleCount: lowEnd ? 25 : 55,
            angle: 60,
            spread: 55,
            origin: { x: 0.15, y: 0.65 },
            colors,
          });
          confetti({
            particleCount: lowEnd ? 25 : 55,
            angle: 120,
            spread: 55,
            origin: { x: 0.85, y: 0.65 },
            colors,
          });
        }, 280);
      } catch {
        // Ignore
      }
    },
    [prefersReduced]
  );

  // Full-screen floating SVG reaction particle
  const pushReaction = useCallback(
    (kind?: 'heart' | 'star' | 'balloon' | 'bow') => {
      const kinds: Array<'heart' | 'star' | 'balloon' | 'bow'> = [
        'heart',
        'star',
        'balloon',
        'bow',
      ];
      const chosenKind =
        kind || kinds[Math.floor(Math.random() * kinds.length)];
      const palette =
        effectiveGender === 'boy'
          ? [
              PALETTE.boy.tide,
              PALETTE.boy.deepTide,
              PALETTE.boy.sand,
              PALETTE.neutral.butter,
            ]
          : [
              PALETTE.girl.peony,
              PALETTE.girl.mulberry,
              PALETTE.girl.sand,
              PALETTE.neutral.butter,
            ];

      const newReaction: FloatingReaction = {
        id: `${Date.now()}-${Math.random()}`,
        kind: chosenKind,
        x: 8 + Math.random() * 84,
        sway: (Math.random() - 0.5) * 90,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: 28 + Math.round(Math.random() * 14),
        duration: 4.6 + Math.random() * 2.0,
      };

      setReactions((prev) => [...prev.slice(-28), newReaction]);
    },
    [effectiveGender]
  );

  // Spawn rising balloons across balanced lanes with organic horizontal sway
  const spawnRisingBalloon = useCallback(() => {
    const lanes = [16, 32, 50, 68, 84];
    const laneIdx = laneCounterRef.current % lanes.length;
    laneCounterRef.current += 1;

    const jitter = (Math.random() - 0.5) * 8;
    const laneX = Math.max(14, Math.min(86, lanes[laneIdx] + jitter));

    const paletteItem =
      BALLOON_NEUTRAL_PALETTE[
        laneCounterRef.current % BALLOON_NEUTRAL_PALETTE.length
      ];

    const newBalloon: RisingBalloon = {
      id: `rising-${Date.now()}-${Math.random()}`,
      laneX,
      swayAmp: (laneCounterRef.current % 2 === 0 ? 1 : -1) * (12 + (laneCounterRef.current % 3) * 5),
      size: 94 + (laneCounterRef.current % 3) * 8,
      duration: 4.5 + (laneCounterRef.current % 3) * 0.45,
      fill: paletteItem.fill,
      shade: paletteItem.shade,
      highlight: paletteItem.highlight,
      rim: paletteItem.rim,
    };

    setRisingBalloons((prev) => [...prev.slice(-7), newBalloon]);
  }, []);

  useEffect(() => {
    if (step !== 'countdown10') return;
    applyThemeVariables('neutral');
    setWashActive(false);
    soundManager.play('swell');

    setRisingBalloons([]);
    const initTimers = [0, 320, 660].map((delay) =>
      setTimeout(spawnRisingBalloon, delay)
    );

    const spawner = setInterval(
      spawnRisingBalloon,
      isLowEndDevice() ? 880 : 720
    );

    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          clearInterval(spawner);
          triggerHaptic([30, 45, 30]);
          setRisingBalloons([]);
          if (latestGenderRef.current || isPrototypeMode) {
            setStep('hero');
          } else {
            setStep('shy');
          }
          return 0;
        }
        const nextVal = prev - 1;
        soundManager.play('tick', nextVal <= 3 ? 1.2 : 1.0);
        if (nextVal <= 3) triggerHaptic(22);
        return nextVal;
      });
    }, 1000);

    return () => {
      initTimers.forEach(clearTimeout);
      clearInterval(spawner);
      clearInterval(countdownTimer);
    };
  }, [step, spawnRisingBalloon]);

  const handlePopRisingBalloon = (
    balloon: RisingBalloon,
    e: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const cx = e.clientX || rect.left + rect.width / 2;
    const cy = e.clientY || rect.top + rect.height / 2;

    const nextScore = poppedScore + 1;
    setPoppedScore(nextScore);

    const pitch = Math.min(1.45, 0.94 + (nextScore % 8) * 0.065);
    soundManager.play('pop', pitch);
    triggerHaptic(24);

    const popWord = POP_WORDS[nextScore % POP_WORDS.length];
    triggerBalloonBurstEffect(cx, cy, balloon.fill, balloon.shade, popWord);

    setRisingBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
  };

  const handlePopHeroBalloon = useCallback(() => {
    if (heroPoppingBeat) return;
    setHeroPoppingBeat(true);

    let pctX = 50;
    let pctY = 50;
    let cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
    let cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;

    if (heroBalloonRef.current && stageRef.current) {
      const bRect = heroBalloonRef.current.getBoundingClientRect();
      const sRect = stageRef.current.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2;
      cy = bRect.top + bRect.height / 2;
      pctX = Math.round(((cx - sRect.left) / sRect.width) * 100);
      pctY = Math.round(((cy - sRect.top) / sRect.height) * 100);
    }

    setWashOrigin({ x: pctX, y: pctY });
    triggerHaptic([35, 60, 85]);

    const triggerTransformation = () => {
      soundManager.play('heroPop');
      const primary =
        effectiveGender === 'boy' ? PALETTE.boy.tide : PALETTE.girl.peony;
      const secondary =
        effectiveGender === 'boy' ? PALETTE.boy.sand : PALETTE.girl.sand;

      triggerBalloonBurstEffect(cx, cy, primary, secondary);
      setWashActive(true);
      applyThemeVariables(effectiveGender);
      fireRevealConfetti(effectiveGender);
      setStep('celebration');
      setHeroPoppingBeat(false);
    };

    if (heroBalloonRef.current && !prefersReduced) {
      const tl = gsap.timeline({ onComplete: triggerTransformation });
      tl.to(heroBalloonRef.current, {
        scaleX: 1.15,
        scaleY: 0.87,
        duration: 0.1,
        ease: 'power2.out',
      }).to(heroBalloonRef.current, {
        scale: 1.3,
        duration: 0.22,
        ease: 'power2.inOut',
      });
    } else {
      setTimeout(triggerTransformation, 200);
    }
  }, [
    heroPoppingBeat,
    effectiveGender,
    prefersReduced,
    triggerBalloonBurstEffect,
    fireRevealConfetti,
  ]);

  useEffect(() => {
    if (step !== 'hero') return;
    setAutoPopCountdown(8);

    const timer = setInterval(() => {
      setAutoPopCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handlePopHeroBalloon();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, handlePopHeroBalloon]);

  useEffect(() => {
    if (step !== 'celebration') return;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => pushReaction(), i * 220);
    }
    const interval = setInterval(() => {
      pushReaction();
    }, 1300);
    return () => clearInterval(interval);
  }, [step, pushReaction]);

  const handleJumpToStep = (targetStep: RevealSequenceStep) => {
    setHeroPoppingBeat(false);
    setSecondsLeft(10);
    setPoppedScore(0);
    setRisingBalloons([]);
    setAutoPopCountdown(8);
    if (targetStep === 'celebration') {
      setWashActive(true);
      applyThemeVariables(effectiveGender);
      fireRevealConfetti(effectiveGender);
    } else {
      setWashActive(false);
      applyThemeVariables('neutral');
    }
    setStep(targetStep);
  };

  const washBgColor =
    effectiveGender === 'boy' ? PALETTE.boy.mist : PALETTE.girl.petal;
  const themeAccentColor =
    effectiveGender === 'boy' ? PALETTE.boy.tide : PALETTE.girl.peony;

  return (
    <>
      {/* FULL-SCREEN FLOATING REACTIONS OVERLAY (Floats across the entire screen from bottom to top!) */}
      {step === 'celebration' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
          <AnimatePresence>
            {reactions.map((rx) => (
              <motion.div
                key={rx.id}
                initial={{
                  y: '105vh',
                  x: 0,
                  opacity: 0,
                  scale: 0.7,
                  rotate: -8,
                }}
                animate={{
                  y: '-18vh',
                  x: [0, rx.sway, -rx.sway * 0.6, rx.sway * 0.4],
                  opacity: [0, 0.96, 0.92, 0],
                  scale: [0.75, 1.08, 1, 0.9],
                  rotate: [-8, 8, -6, 6],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: rx.duration,
                  ease: 'easeOut',
                }}
                style={{ left: `${rx.x}%`, top: 0 }}
                className="absolute -translate-x-1/2"
              >
                <ReactionParticleSvg
                  kind={rx.kind}
                  color={rx.color}
                  size={rx.size}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <section
        ref={stageRef}
        aria-label="Synced Balloon Pop Reveal Stage"
        className="paper-card-surface relative mx-auto w-full max-w-3xl overflow-hidden rounded-[32px] px-5 py-7 sm:px-10 sm:py-9 transition-colors duration-700"
      >
        {/* Expanding Radial Color Wash from the final popped balloon's center */}
        <AnimatePresence>
          {washActive && (
            <motion.div
              key={`color-wash-${effectiveGender}`}
              initial={{
                clipPath: `circle(0% at ${washOrigin.x}% ${washOrigin.y}%)`,
                opacity: 1,
              }}
              animate={{
                clipPath: `circle(165% at ${washOrigin.x}% ${washOrigin.y}%)`,
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: prefersReduced ? 0.2 : 1.05,
                ease: EASINGS.editorialOut,
              }}
              style={{ backgroundColor: washBgColor }}
              className="pointer-events-none absolute inset-0 z-0"
            />
          )}
        </AnimatePresence>

        {/* Shockwave Ring, Radial Petals & Pop Word Burst Layer */}
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          <AnimatePresence>
            {bursts.map((burst) => (
              <div
                key={burst.id}
                style={{ left: burst.x, top: burst.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  initial={{ scale: 0.2, opacity: 0.95 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.48, ease: EASINGS.editorialOut }}
                  style={{ borderColor: burst.primaryColor }}
                  className="h-24 w-24 rounded-full border-2"
                />

                {burst.label && (
                  <motion.span
                    initial={{ y: 0, opacity: 1, scale: 0.85 }}
                    animate={{ y: -38, opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.65, ease: EASINGS.editorialOut }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--bg-surface)]/95 px-3 py-0.5 font-script-note text-xl text-[var(--accent-primary)] shadow-xs"
                  >
                    {burst.label}
                  </motion.span>
                )}

                {burst.particles.map((pt, i) => (
                  <motion.span
                    key={i}
                    initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos(pt.angle) * pt.distance,
                      y: Math.sin(pt.angle) * pt.distance + 10,
                      scale: 0.2,
                      rotate: pt.rot,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.58, ease: EASINGS.editorialOut }}
                    style={{
                      width: pt.size,
                      height: pt.isCircle ? pt.size : pt.size * 1.4,
                      backgroundColor: pt.color,
                      borderRadius: pt.isCircle ? '9999px' : '3px',
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block"
                  />
                ))}
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* Symmetrical Top Header Bar */}
        <div className="relative z-20 flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Baby {babySurname} · Balloon Reveal
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => soundManager.toggleMute()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
            >
              {isMuted ? (
                <>
                  <SpeakerSlash size={15} weight="light" />
                  <span>Sound Off</span>
                </>
              ) : (
                <>
                  <SpeakerHigh size={15} weight="light" />
                  <span>Sound On</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleJumpToStep('countdown10')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
            >
              <ArrowCounterClockwise size={14} weight="light" />
              <span>Restart 10s</span>
            </button>
          </div>
        </div>

        {/* Compact Prototype Switcher Pill */}
        {isPrototypeMode && (
          <div className="relative z-20 mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 px-3 py-2 text-xs">
            {(
              [
                { id: 'countdown10', label: '1. 10s Rising Balloons' },
                { id: 'hero', label: '2. Final Balloon' },
                { id: 'celebration', label: '3. Reveal Result' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleJumpToStep(item.id)}
                className={`min-h-[32px] rounded-full px-3 py-1 font-medium transition ${
                  step === item.id
                    ? 'bg-[var(--accent-primary)] text-[var(--linen)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--accent-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {onChangePreviewGender && (
              <div className="flex items-center gap-1 border-l border-[var(--border-hairline)] pl-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangePreviewGender('boy');
                    if (step === 'celebration') applyThemeVariables('boy');
                  }}
                  className={`min-h-[32px] rounded-full px-3 py-1 font-medium transition ${
                    effectiveGender === 'boy'
                      ? 'bg-[#4F7FA3] text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Boy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangePreviewGender('girl');
                    if (step === 'celebration') applyThemeVariables('girl');
                  }}
                  className={`min-h-[32px] rounded-full px-3 py-1 font-medium transition ${
                    effectiveGender === 'girl'
                      ? 'bg-[#D4808F] text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Girl
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Centered Stage Area */}
        <div className="relative z-10 flex min-h-[500px] flex-col items-center justify-center py-4 text-center">
          <AnimatePresence mode="wait">
            {/* SHY FALLBACK */}
            {step === 'shy' && (
              <motion.div
                key="stage-shy"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mx-auto flex max-w-md flex-col items-center space-y-4 py-8 text-center"
              >
                <PaperBalloonSvg
                  fill={PALETTE.neutral.linen}
                  shade={PALETTE.neutral.paper}
                  highlight="#FFFFFF"
                  isHero
                  size={120}
                />
                <h2 className="font-display-editorial text-3xl text-[var(--text-primary)]">
                  Baby is shy... one moment
                </h2>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Waiting for Mommy and Daddy to release the final ribbon.
                </p>
              </motion.div>
            )}

            {/* STEP 1: 10-SECOND COUNTDOWN WITH RISING BALLOONS (Clean separated HUD + unobstructed Sky Window) */}
            {step === 'countdown10' && (
              <motion.div
                key="stage-countdown10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.4, ease: EASINGS.editorialOut }}
                className="flex w-full flex-col items-center space-y-4"
              >
                {/* Clean Structured Top Header Strip (Outside the balloon sky window so text never overlaps balloons) */}
                <div className="grid w-full grid-cols-3 items-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-4 py-3">
                  <div className="text-left">
                    <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      Final Countdown
                    </span>
                    <div className="inline-flex items-baseline gap-1">
                      <RollingNumber
                        value={secondsLeft}
                        pad={2}
                        className="font-display-editorial text-3xl sm:text-4xl text-[var(--text-primary)]"
                      />
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        sec
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent-primary)]">
                      <HandTap size={15} weight="light" />
                      <span>Tap Balloons!</span>
                    </span>
                    <p className="hidden sm:block text-xs text-[var(--text-secondary)]">
                      Pop the rising balloons while counting down
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      Balloons Popped
                    </span>
                    <RollingNumber
                      value={poppedScore}
                      pad={1}
                      className="font-display-editorial text-3xl sm:text-4xl text-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                {/* Unobstructed Sky Window where Living Balloons Float Upward with Sway & Waving Tails */}
                <div className="relative h-[380px] w-full overflow-hidden rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/45">
                  {/* Subtle centered watermark countdown number in the sky */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center select-none opacity-15"
                  >
                    <span className="font-display-editorial text-[140px] sm:text-[170px] leading-none text-[var(--text-primary)]">
                      {secondsLeft}
                    </span>
                  </div>

                  {/* Rising Balloons (GPU-Composited CSS Keyframes for Smooth 60 FPS on Mobile) */}
                  {risingBalloons.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-label="Tap rising balloon to pop"
                      onAnimationEnd={() => {
                        setRisingBalloons((prev) =>
                          prev.filter((item) => item.id !== b.id)
                        );
                      }}
                      onPointerDown={(e) => handlePopRisingBalloon(b, e)}
                      style={
                        {
                          left: `${b.laneX}%`,
                          animationDuration: `${b.duration}s`,
                          '--sway-x': `${b.swayAmp}px`,
                        } as React.CSSProperties
                      }
                      className="balloon-float-up group absolute top-0 cursor-pointer p-2 focus:outline-none active:scale-95"
                    >
                      <PaperBalloonSvg
                        fill={b.fill}
                        shade={b.shade}
                        highlight={b.highlight}
                        rim={b.rim}
                        size={b.size}
                        animateTail={false}
                        className="[&_svg]:filter-none"
                      />
                    </button>
                  ))}
                </div>

                {/* Clean Bottom Footer Bar (Outside the balloon sky window) */}
                <div className="flex w-full flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSecondsLeft((prev) => prev + 10)}
                    className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
                  >
                    +10s More Balloons
                  </button>

                  <span className="font-script-note text-xl text-[var(--text-secondary)]">
                    Sabay-sabay tayo...
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setRisingBalloons([]);
                      setStep('hero');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-medium text-[var(--linen)] shadow-xs transition hover:brightness-105"
                  >
                    <span>Skip to Final Balloon</span>
                    <ArrowRight size={14} weight="light" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: THE FINAL LARGE GLOWING BALLOON (Living Buoyancy + Waving Ribbons & Tail) */}
            {step === 'hero' && (
              <motion.div
                key="stage-hero"
                initial={{ opacity: 0, y: 60, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 1.25 }}
                transition={{ duration: 0.55, ease: EASINGS.editorialOut }}
                className="mx-auto flex max-w-md flex-col items-center justify-center space-y-5 py-4 text-center"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--bg-primary)] px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                  <Sparkle size={14} weight="light" />
                  <span>
                    {poppedScore > 0
                      ? `You popped ${poppedScore} balloons! Now for the real one`
                      : 'The Final Balloon Has Arrived'}
                  </span>
                </div>

                <h2 className="font-display-editorial text-3xl sm:text-5xl text-[var(--text-primary)]">
                  One Tap for the Answer
                </h2>

                <p className="text-sm text-[var(--text-secondary)]">
                  Tap the golden balloon in the center to reveal Baby {babySurname}.
                </p>

                <div className="relative my-2 flex items-center justify-center">
                  <motion.button
                    ref={heroBalloonRef}
                    type="button"
                    aria-label="Tap final balloon to reveal gender"
                    onClick={handlePopHeroBalloon}
                    animate={
                      prefersReduced
                        ? {}
                        : {
                            y: [-10, 10, -10],
                            x: [-7, 7, -7],
                            rotate: [-3, 3, -3],
                            scaleX: [0.98, 1.03, 0.98],
                            scaleY: [1.03, 0.98, 1.03],
                          }
                    }
                    transition={{
                      y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
                      x: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                      rotate: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                      scaleX: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                      scaleY: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="relative flex cursor-pointer flex-col items-center justify-center rounded-full p-4 focus:outline-none"
                  >
                    <PaperBalloonSvg
                      fill="#FBF8F2"
                      shade="#E8CF92"
                      highlight="#FFFFFF"
                      rim="#C98A62"
                      isHero
                      animateTail
                      size={174}
                    />
                  </motion.button>
                </div>

                <TactileButton variant="primary" onClick={handlePopHeroBalloon}>
                  <Sparkle size={16} weight="light" />
                  <span>Pop the Final Balloon ({autoPopCountdown}s)</span>
                </TactileButton>
              </motion.div>
            )}

            {/* STEP 3: CELEBRATION RESULT (DEAD-CENTER) */}
            {step === 'celebration' && (
              <motion.div
                key={`stage-celebration-${effectiveGender}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASINGS.editorialOut }}
                className="relative mx-auto flex w-full max-w-xl flex-col items-center justify-center space-y-6 py-4 text-center"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                  The Secret is Out
                </span>

                <div className="flex flex-col items-center space-y-3">
                  <p className="font-script-note text-2xl sm:text-3xl text-[var(--text-secondary)]">
                    Welcome to the family, Baby {babySurname}
                  </p>

                  <SplitText
                    key={`headline-${effectiveGender}`}
                    text={
                      effectiveGender === 'boy' ? "It's a Boy" : "It's a Girl"
                    }
                    mode="chars"
                    stagger={0.04}
                    className="font-display-editorial text-5xl sm:text-7xl font-semibold leading-tight text-[var(--text-primary)]"
                  />
                </div>

                <PaperOrnamentDivider />

                <p className="max-w-md text-sm sm:text-base leading-relaxed text-[var(--text-primary)]/90">
                  {effectiveGender === 'boy'
                    ? 'Our little voyager is on his way, surrounded by the love of family near and far.'
                    : 'Our little dreamer is on her way, surrounded by the love of family near and far.'}
                </p>

                {/* Centered Reaction Bar — Label on Top + Symmetrical 4-Column Row */}
                <div className="relative z-20 w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 p-3.5 space-y-2.5 shadow-2xs">
                  <span className="block text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Tap to Float Reactions Across the Screen
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { kind: 'heart', label: 'Heart' },
                        { kind: 'star', label: 'Star' },
                        { kind: 'balloon', label: 'Balloon' },
                        { kind: 'bow', label: 'Ribbon' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => {
                          triggerHaptic(14);
                          soundManager.play('pop', 1.25);
                          pushReaction(item.kind);
                          pushReaction(item.kind);
                          pushReaction(item.kind);
                        }}
                        className="flex flex-col sm:flex-row min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/75 px-2 py-2 text-xs font-medium text-[var(--text-primary)] transition active:scale-95 hover:border-[var(--accent-primary)]"
                      >
                        <ReactionParticleSvg
                          kind={item.kind}
                          color={themeAccentColor}
                          size={16}
                        />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Centered Next Step Actions */}
                <div className="relative z-20 flex flex-wrap items-center justify-center gap-3 pt-2">
                  {onCompleteToResult && (
                    <TactileButton
                      variant="primary"
                      onClick={onCompleteToResult}
                    >
                      <span>See Results & Honor Roll</span>
                      <ArrowRight size={16} weight="light" />
                    </TactileButton>
                  )}
                  {onOpenPhotobooth && (
                    <TactileButton
                      variant="secondary"
                      onClick={onOpenPhotobooth}
                    >
                      <Camera size={17} weight="light" />
                      <span>Open Photobooth</span>
                    </TactileButton>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
