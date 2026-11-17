'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  CalendarPlus,
  ShareNetwork,
  QrCode,
  ArrowRight,
  Copy,
  Check,
  X,
  CalendarBlank,
  Clock,
  SpeakerHigh,
  SpeakerSlash,
} from '@phosphor-icons/react';
import { BALLOON_NEUTRAL_PALETTE, EASINGS } from '@/lib/tokens';
import { soundManager, triggerHaptic } from '@/lib/sound';
import {
  CountdownBreakdown,
  createGoogleCalendarUrl,
  downloadIcsFile,
  formatPhilippineTime,
  getPhilippineDateParts,
} from '@/lib/time';
import {
  PaperBalloonSvg,
  PaperOrnamentDivider,
} from '@/components/shared/PaperIllustrations';
import {
  SplitText,
  RollingNumber,
  TactileButton,
} from '@/components/shared/MotionPrimitives';

export interface WelcomeStageProps {
  revealTimeIso: string;
  countdown: CountdownBreakdown;
  coupleNames: string;
  babySurname: string;
  tallyTotal: number;
  onJoinCelebration: () => void;
  onReturnToWaitingRoom?: () => void;
  onLaunchPrototype?: () => void;
}

export function WelcomeStage({
  revealTimeIso,
  countdown,
  coupleNames,
  babySurname,
  tallyTotal,
  onJoinCelebration,
  onReturnToWaitingRoom,
}: WelcomeStageProps) {
  const prefersReduced = useReducedMotion();
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  useEffect(() => {
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

  const friendlyPhtDate = formatPhilippineTime(revealTimeIso, true);
  const dateParts = getPhilippineDateParts(revealTimeIso);

  useEffect(() => {
    if (!shareModalOpen || typeof window === 'undefined') return;
    QRCode.toDataURL(window.location.origin, {
      width: 220,
      margin: 1,
      color: {
        dark: '#26302B',
        light: '#FBF8F2',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [shareModalOpen]);

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Baby ${babySurname} Virtual Gender Reveal`,
          text: `Join ${coupleNames} for our synced virtual gender reveal on ${friendlyPhtDate}!`,
          url: window.location.origin,
        });
        return;
      } catch {
        // Fallback to modal
      }
    }
    setShareModalOpen(true);
  };

  return (
    <section
      aria-label="Welcome Invitation Cover"
      className="mx-auto w-full max-w-2xl py-2 sm:py-6"
    >
      <div className="paper-card-surface relative mx-auto flex flex-col items-center overflow-hidden rounded-[32px] px-5 py-9 sm:px-12 sm:py-12 text-center space-y-6">
        {/* Top-Right Music Toggle Pill */}
        <div className="flex w-full items-center justify-end -mt-2">
          <button
            type="button"
            onClick={handleToggleMusic}
            aria-label={isMuted ? 'Unmute celebration music' : 'Mute celebration music'}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 px-3 py-1 text-[11px] font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            {isMuted ? (
              <>
                <SpeakerSlash size={14} weight="light" />
                <span>Unmute Music</span>
              </>
            ) : (
              <>
                <SpeakerHigh size={14} weight="light" className="text-[var(--accent-primary)]" />
                <span>Music On</span>
              </>
            )}
          </button>
        </div>

        {/* Centered Hero Paper Balloon Trio (With Living Waving Tails) */}
        <div className="flex items-end justify-center gap-3">
          <motion.div
            animate={prefersReduced ? {} : { y: [-3, 4, -3] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PaperBalloonSvg
              fill={BALLOON_NEUTRAL_PALETTE[0].fill}
              shade={BALLOON_NEUTRAL_PALETTE[0].shade}
              highlight={BALLOON_NEUTRAL_PALETTE[0].highlight}
              animateTail
              size={64}
            />
          </motion.div>

          <motion.div
            animate={prefersReduced ? {} : { y: [4, -5, 4] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PaperBalloonSvg
              fill={BALLOON_NEUTRAL_PALETTE[1].fill}
              shade={BALLOON_NEUTRAL_PALETTE[1].shade}
              highlight={BALLOON_NEUTRAL_PALETTE[1].highlight}
              isHero
              animateTail
              size={92}
            />
          </motion.div>

          <motion.div
            animate={prefersReduced ? {} : { y: [-3, 4, -3] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PaperBalloonSvg
              fill={BALLOON_NEUTRAL_PALETTE[2].fill}
              shade={BALLOON_NEUTRAL_PALETTE[2].shade}
              highlight={BALLOON_NEUTRAL_PALETTE[2].highlight}
              animateTail
              size={64}
            />
          </motion.div>
        </div>

        {/* Invitation Header */}
        <div className="flex flex-col items-center space-y-2">
          <p className="font-script-note text-2xl sm:text-3xl text-[var(--accent-primary)]">
            {coupleNames} invite you to celebrate
          </p>

          <SplitText
            text={`Baby ${babySurname}`}
            mode="words"
            className="font-display-editorial text-4xl sm:text-6xl font-semibold text-[var(--text-primary)]"
          />

          <p className="mx-auto max-w-md pt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            Near or far, join our family in casting a guess, sealing a wish, and
            popping the balloons together at the exact same moment.
          </p>
        </div>

        <PaperOrnamentDivider />

        {/* Clean, Centered, Uncluttered Date, Time & Countdown Card */}
        <div className="w-full rounded-[24px] border border-[var(--border-hairline)] bg-[var(--bg-primary)]/55 p-4 sm:p-6 space-y-4">
          {/* Centered Date & Time Pills */}
          <div className="flex flex-col items-center space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              Reveal Schedule
            </span>

            <p className="font-display-editorial text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              {dateParts.weekday}, {dateParts.monthLong} {dateParts.dayNumber}, {dateParts.year}
            </p>

            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-2xs">
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank size={14} weight="light" className="text-[var(--accent-primary)]" />
                <span>{dateParts.monthShort} {dateParts.dayNumber}</span>
              </span>
              <span className="h-3 w-[1px] bg-[var(--border-hairline)]" />
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} weight="light" className="text-[var(--accent-primary)]" />
                <span>{dateParts.formattedTime}</span>
              </span>
            </div>
          </div>

          {/* 4 Symmetrical Countdown Boxes — Short Labels so Text Never Overflows on Mobile */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-1">
            {[
              { label: 'Days', value: countdown.days },
              { label: 'Hours', value: countdown.hours },
              { label: 'Mins', value: countdown.minutes },
              { label: 'Secs', value: countdown.seconds },
            ].map((unit) => (
              <div
                key={unit.label}
                className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] py-3 px-1.5 shadow-2xs"
              >
                <RollingNumber
                  value={unit.value}
                  pad={2}
                  className="font-display-editorial text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]"
                />
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Single Clear Primary CTA (or Return to Waiting Room for already-joined guests) */}
        <div className="flex w-full flex-col items-center space-y-2.5 pt-1">
          {onReturnToWaitingRoom ? (
            <>
              <TactileButton
                variant="primary"
                onClick={onReturnToWaitingRoom}
                className="w-full max-w-xs py-3.5 text-base shadow-sm"
              >
                <span>Return to Waiting Room</span>
                <ArrowRight size={18} weight="light" />
              </TactileButton>
              <button
                type="button"
                onClick={onJoinCelebration}
                className="text-xs font-medium text-[var(--accent-primary)] underline-offset-4 hover:underline"
              >
                Edit my guess or wish
              </button>
            </>
          ) : (
            <TactileButton
              variant="primary"
              onClick={onJoinCelebration}
              className="w-full max-w-xs py-3.5 text-base shadow-sm"
            >
              <span>Join the celebration</span>
              <ArrowRight size={18} weight="light" />
            </TactileButton>
          )}

          <p className="text-xs text-[var(--text-secondary)]">
            {tallyTotal} family members &amp; friends have joined
          </p>
        </div>

        {/* Quiet Centered Utility Row: Add to Calendar & Share */}
        <div className="flex w-full flex-wrap items-center justify-center gap-2.5 border-t border-[var(--border-hairline)] pt-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarMenuOpen((prev) => !prev)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
            >
              <CalendarPlus size={15} weight="light" />
              <span>Add to Calendar</span>
            </button>

            <AnimatePresence>
              {calendarMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: EASINGS.editorialOut }}
                  className="paper-card-surface absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 w-56 rounded-2xl p-2 text-left shadow-lg"
                >
                  <a
                    href={createGoogleCalendarUrl({
                      title: `Baby ${babySurname} Virtual Gender Reveal`,
                      details: `Join ${coupleNames} live for our synced virtual gender reveal.`,
                      revealTimeIso,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setCalendarMenuOpen(false)}
                    className="block rounded-xl px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                  >
                    Google Calendar
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      downloadIcsFile({
                        title: `Baby ${babySurname} Virtual Gender Reveal`,
                        details: `Join ${coupleNames} live for our synced virtual gender reveal.`,
                        revealTimeIso,
                      });
                      setCalendarMenuOpen(false);
                    }}
                    className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                  >
                    Download .ics File
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            <ShareNetwork size={15} weight="light" />
            <span>Share Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            <QrCode size={15} weight="light" />
            <span>QR Code</span>
          </button>
        </div>
      </div>

      {/* Share & QR Code Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="paper-card-surface relative flex w-full max-w-sm flex-col items-center rounded-3xl p-6 text-center space-y-4"
            >
              <button
                type="button"
                aria-label="Close share modal"
                onClick={() => setShareModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} weight="light" />
              </button>

              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                Invite Family &amp; Friends
              </p>
              <h3 className="font-display-editorial text-2xl text-[var(--text-primary)]">
                Share to Messenger or Viber
              </h3>

              {qrDataUrl && (
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[#FBF8F2] p-3">
                  <img
                    src={qrDataUrl}
                    alt="QR Code for Virtual Gender Reveal"
                    className="h-44 w-44"
                  />
                </div>
              )}

              <TactileButton
                variant="primary"
                onClick={handleCopyLink}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check size={16} weight="light" />
                    <span>Invitation Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} weight="light" />
                    <span>Copy Invitation Link</span>
                  </>
                )}
              </TactileButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
