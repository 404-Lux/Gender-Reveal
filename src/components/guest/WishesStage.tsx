'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { EASINGS, RevealGender } from '@/lib/tokens';
import { soundManager, triggerHaptic } from '@/lib/sound';
import {
  getOrCreateDeviceId,
  loadWishDraft,
  saveWishDraft,
} from '@/lib/clientQueue';
import { WaxSealSvg } from '@/components/shared/PaperIllustrations';
import { SplitText, TactileButton } from '@/components/shared/MotionPrimitives';

const QUICK_WISH_STARTERS = [
  'Grow up healthy, kind-hearted, and full of wonder!',
  'So excited to meet you, little one! Mahal na mahal ka namin.',
  'Wishing you a lifetime of love, good health, and happy adventures.',
] as const;

export interface WishesStageProps {
  guestName: string;
  guestGuess: RevealGender | null;
  babySurname: string;
  coupleNames: string;
  isRevealReady?: boolean;
  onBack: () => void;
  onSkipToWaitingRoom: () => void;
  onSubmitWish: (data: {
    wishForBaby: string;
    noteForParents: string;
  }) => Promise<void>;
}

export function WishesStage({
  guestName,
  guestGuess,
  babySurname,
  coupleNames,
  isRevealReady = false,
  onBack,
  onSkipToWaitingRoom,
  onSubmitWish,
}: WishesStageProps) {
  const [wishForBaby, setWishForBaby] = useState('');
  const [noteForParents, setNoteForParents] = useState('');
  const [showParentNoteField, setShowParentNoteField] = useState(false);
  const [foldPhase, setFoldPhase] = useState<
    'writing' | 'sliding' | 'folding' | 'sealed'
  >('writing');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    let hasLocal = false;
    const draft = loadWishDraft();
    if (draft.wishForBaby || draft.noteForParents) {
      hasLocal = true;
      if (draft.wishForBaby) setWishForBaby(draft.wishForBaby);
      if (draft.noteForParents) {
        setNoteForParents(draft.noteForParents);
        setShowParentNoteField(true);
      }
    } else {
      try {
        const lastRaw = localStorage.getItem('pl_v2_last_wish');
        if (lastRaw) {
          const parsed = JSON.parse(lastRaw) as {
            wishForBaby?: string;
            noteForParents?: string;
          };
          if (parsed.wishForBaby || parsed.noteForParents) {
            hasLocal = true;
            if (parsed.wishForBaby) setWishForBaby(parsed.wishForBaby);
            if (parsed.noteForParents) {
              setNoteForParents(parsed.noteForParents);
              setShowParentNoteField(true);
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    let cancelled = false;
    if (!hasLocal && guestName) {
      fetch('/api/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getMyWish',
          deviceId: getOrCreateDeviceId(),
          name: guestName,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json?.wish) return;
          setWishForBaby((prev) => prev || json.wish.wish_for_baby || '');
          if (json.wish.note_for_parents) {
            setNoteForParents((prev) => prev || json.wish.note_for_parents || '');
            setShowParentNoteField(true);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      timersRef.current.forEach(clearTimeout);
    };
  }, [guestName]);

  useEffect(() => {
    if (foldPhase === 'writing') {
      saveWishDraft(wishForBaby, noteForParents);
    }
  }, [wishForBaby, noteForParents, foldPhase]);

  const handleSealAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (wishForBaby.trim().length < 3) {
      setError(
        'Please write a short wish or tap one of the quick wishes above.'
      );
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Only show "sealed" animation AFTER real server acknowledgment
      await onSubmitWish({
        wishForBaby: wishForBaby.trim(),
        noteForParents: noteForParents.trim(),
      });
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach the server. Your wish is safely saved here — tap to retry.'
      );
      return;
    }

    // Clear active draft and remember last submitted wish so guest can edit it later
    saveWishDraft('', '');
    try {
      localStorage.setItem(
        'pl_v2_last_wish',
        JSON.stringify({
          wishForBaby: wishForBaby.trim(),
          noteForParents: noteForParents.trim(),
        })
      );
    } catch {
      // Ignore
    }
    setSubmitting(false);

    // Step 1: Slide letter into pocket (0s -> 1.15s)
    setFoldPhase('sliding');
    triggerHaptic(18);
    soundManager.play('seal', 0.9);

    // Step 2: Fold top envelope flap down (1.15s -> 2.25s)
    const t1 = setTimeout(() => {
      setFoldPhase('folding');
      soundManager.play('tick', 0.85);
    }, 1150);

    // Step 3: Stamp Wax Seal dead-center (at 2.25s) and stay on screen until guest clicks "Continue to Waiting Room"
    const t2 = setTimeout(() => {
      soundManager.play('seal', 1.12);
      triggerHaptic([25, 45, 30]);
      setFoldPhase('sealed');
    }, 2250);

    timersRef.current = [t1, t2];
  };

  return (
    <section
      aria-label="Leave Wishes for Baby and Parents"
      className="mx-auto w-full max-w-2xl py-2 sm:py-6"
    >
      <AnimatePresence mode="wait">
        {foldPhase === 'writing' ? (
          <motion.form
            key="letter-writing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.45, ease: EASINGS.editorialOut }}
            onSubmit={handleSealAndSubmit}
            className="paper-card-surface mx-auto flex flex-col items-center rounded-[32px] px-5 py-8 sm:px-10 sm:py-10 space-y-6 text-center"
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                Step 2 of 2 · Your Wish
              </span>
              <SplitText
                text={`A Note for Baby ${babySurname}`}
                mode="words"
                className="font-display-editorial text-3xl sm:text-4xl text-[var(--text-primary)]"
              />
              <p className="max-w-md text-xs sm:text-sm text-[var(--text-secondary)]">
                Leave a short blessing for the baby&apos;s keepsake book, then seal your envelope.
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 px-4 py-3 text-left">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  From
                </span>
                <span className="font-script-note text-2xl text-[var(--text-primary)]">
                  {guestName || 'A Loving Guest'}
                </span>
              </div>
              {guestGuess && (
                <span className="rounded-full border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] px-3.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
                  Team {guestGuess === 'boy' ? 'Boy' : 'Girl'}
                </span>
              )}
            </div>

            {/* Quick Wish Starters */}
            <div className="w-full space-y-2 text-left">
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Tap a quick starter or write your own below:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_WISH_STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setWishForBaby(starter);
                      setError(null);
                    }}
                    className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                  >
                    &ldquo;{starter}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full space-y-2 text-left">
              <label
                htmlFor="wish-baby-textarea"
                className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-primary)]"
              >
                Your Message for Baby {babySurname} *
              </label>
              <textarea
                id="wish-baby-textarea"
                rows={4}
                required
                value={wishForBaby}
                onChange={(e) => setWishForBaby(e.target.value)}
                placeholder="Write your wish or blessing for the little one..."
                className="w-full resize-none rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/40 p-4 font-display-editorial text-base sm:text-lg text-[var(--text-primary)] placeholder:font-sans placeholder:text-sm placeholder:text-[var(--text-secondary)]/55 focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none"
              />
            </div>

            <div className="w-full text-left">
              {!showParentNoteField ? (
                <button
                  type="button"
                  onClick={() => setShowParentNoteField(true)}
                  className="text-xs font-medium text-[var(--accent-primary)] underline underline-offset-4 hover:opacity-80"
                >
                  + Add an optional private note for {coupleNames}
                </button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="note-parents-textarea"
                    className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]"
                  >
                    Optional Private Note for {coupleNames}
                  </label>
                  <textarea
                    id="note-parents-textarea"
                    rows={3}
                    value={noteForParents}
                    onChange={(e) => setNoteForParents(e.target.value)}
                    placeholder="Words of encouragement or excitement for Mommy & Daddy..."
                    className="w-full resize-none rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/40 p-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/55 focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="text-center text-xs font-medium text-[var(--accent-primary)]"
              >
                {error}
              </p>
            )}

            <div className="flex w-full flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-6">
              <div className="flex w-full sm:w-auto items-center justify-center gap-2">
                <TactileButton
                  variant="ghost"
                  onClick={onBack}
                  disabled={submitting}
                >
                  <ArrowLeft size={16} weight="light" />
                  <span>Back</span>
                </TactileButton>
                <TactileButton
                  variant="ghost"
                  onClick={onSkipToWaitingRoom}
                  disabled={submitting}
                >
                  <span>Skip for Now</span>
                </TactileButton>
              </div>

              <TactileButton
                type="submit"
                variant="primary"
                disabled={submitting}
                aria-busy={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <ArrowsClockwise size={17} weight="light" className="animate-spin" />
                    <span>Sealing &amp; Saving, please wait...</span>
                  </>
                ) : (
                  <>
                    <EnvelopeSimple size={17} weight="light" />
                    <span>
                      {error ? 'Retry Sending Wish' : 'Seal My Keepsake Letter'}
                    </span>
                  </>
                )}
              </TactileButton>
            </div>

            {submitting && (
              <p
                role="status"
                aria-live="polite"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--accent-primary)]"
              >
                <ArrowsClockwise size={13} weight="light" className="animate-spin" />
                <span>Sealing your letter... please wait a moment.</span>
              </p>
            )}
          </motion.form>
        ) : (
          /* DELIBERATE, UNHURRIED 3-STEP ENVELOPE FOLD & CENTERED WAX SEAL */
          <motion.div
            key="envelope-folding-stage"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASINGS.editorialOut }}
            className="paper-card-surface mx-auto flex flex-col items-center justify-center rounded-[32px] px-6 py-12 text-center space-y-7"
          >
            {/* Envelope SVG: 400x280, centered at (200, 140) = (50%, 50%) */}
            <div className="relative mx-auto w-full max-w-[360px]">
              <svg
                viewBox="0 0 400 280"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="block w-full paper-cut-shadow"
              >
                {/* Envelope Back Body */}
                <rect
                  x="20"
                  y="20"
                  width="360"
                  height="240"
                  rx="14"
                  fill="#EAE1D3"
                  stroke="#C9CEC6"
                  strokeWidth="1.5"
                />

                {/* Step 1: Letter Sheet glides slowly down into the envelope pocket */}
                <motion.g
                  initial={{ y: -64 }}
                  animate={{ y: 20 }}
                  transition={{ duration: 1.15, ease: EASINGS.editorialOut }}
                >
                  <rect
                    x="44"
                    y="26"
                    width="312"
                    height="190"
                    rx="8"
                    fill="#FBF8F2"
                    stroke="#D8CEBE"
                  />
                  <line
                    x1="80"
                    y1="62"
                    x2="320"
                    y2="62"
                    stroke="#C98A62"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="80"
                    y1="86"
                    x2="320"
                    y2="86"
                    stroke="#C9CEC6"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="100"
                    y1="108"
                    x2="300"
                    y2="108"
                    stroke="#C9CEC6"
                    strokeWidth="1.2"
                  />
                  <text
                    x="200"
                    y="50"
                    textAnchor="middle"
                    fill="#26302B"
                    fontSize="12"
                    fontFamily="Georgia, serif"
                  >
                    For Baby {babySurname} — from {guestName || 'Guest'}
                  </text>
                </motion.g>

                {/* Left & Right Flaps meeting at exact center (200, 140) */}
                <path
                  d="M20 20 L200 140 L20 260 Z"
                  fill="#F4EEE3"
                  stroke="#D8CEBE"
                  strokeWidth="1.2"
                />
                <path
                  d="M380 20 L200 140 L380 260 Z"
                  fill="#EFE6D5"
                  stroke="#D8CEBE"
                  strokeWidth="1.2"
                />

                {/* Bottom Pocket Flap meeting at exact center (200, 140) */}
                <path
                  d="M20 260 L200 140 L380 260 Z"
                  fill="#FBF8F2"
                  stroke="#C9CEC6"
                  strokeWidth="1.2"
                />

                {/* Step 2: Top Flap folds smoothly down so its tip lands at exact center (200, 140) */}
                <motion.path
                  initial={{ d: 'M20 20 L200 4 L380 20 Z', fill: '#EAE1D3' }}
                  animate={{
                    d:
                      foldPhase === 'sliding'
                        ? 'M20 20 L200 4 L380 20 Z'
                        : 'M20 20 L200 148 L380 20 Z',
                    fill: foldPhase === 'sliding' ? '#EAE1D3' : '#F4EEE3',
                  }}
                  transition={{
                    duration: 1.05,
                    ease: EASINGS.editorialOut,
                  }}
                  stroke="#C9CEC6"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Step 3: Flex-Centered Wax Seal lands DEAD-CENTER at (50%, 50%) */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <AnimatePresence>
                  {foldPhase === 'sealed' && (
                    <motion.div
                      initial={{ scale: 2.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={EASINGS.springTactile}
                      className="flex items-center justify-center"
                    >
                      <WaxSealSvg size={66} label={babySurname.charAt(0)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <p className="font-script-note text-3xl text-[var(--accent-primary)]">
                {foldPhase === 'sealed'
                  ? 'Salamat sa wishes!'
                  : 'Preparing your keepsake letter...'}
              </p>
              <h3 className="font-display-editorial text-2xl sm:text-3xl text-[var(--text-primary)]">
                {foldPhase === 'sliding' && 'Placing letter into the envelope...'}
                {foldPhase === 'folding' && 'Folding the cotton paper flap...'}
                {foldPhase === 'sealed' && 'Stamped & Sealed in the Memory Book'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {foldPhase === 'sealed'
                  ? 'Your wish is safely tucked away for Mommy, Daddy, and Baby.'
                  : 'One quiet moment...'}
              </p>
            </div>

            {foldPhase === 'sealed' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASINGS.editorialOut }}
              >
                <TactileButton variant="primary" onClick={onSkipToWaitingRoom}>
                  <span>
                    {isRevealReady
                      ? 'Watch Balloon Pop Reveal'
                      : 'Continue to Waiting Room'}
                  </span>
                  <ArrowRight size={15} weight="light" />
                </TactileButton>
              </motion.div>
            ) : (
              <div className="h-[46px]" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
