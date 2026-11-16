'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { soundManager, triggerHaptic } from '@/lib/sound';
import { EASINGS } from '@/lib/tokens';

/**
 * Full-viewport SVG feTurbulence noise/grain overlay (approx. 7.5% opacity)
 * + Global sound effect initialization + Persistent Music Toggle + Floating Scroll-to-Top ("Up Arrow") button.
 */
export function PaperGrainOverlay() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  useEffect(() => {
    soundManager.preloadAll();
    setIsMuted(soundManager.getMuted());
    const unsub = soundManager.subscribe((m) => setIsMuted(m));

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      unsub();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollToTop = () => {
    triggerHaptic(12);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleMusic = () => {
    triggerHaptic(14);
    const nextMuted = soundManager.toggleMute();
    if (!nextMuted) {
      soundManager.startLullaby();
    } else {
      soundManager.stopLullaby();
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
        style={{ opacity: 0.075, mixBlendMode: 'multiply' }}
      >
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="paper-and-light-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.78"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter="url(#paper-and-light-grain)"
          />
        </svg>
      </div>

      {/* Global Floating Music Toggle (Available on Every Page) */}
      <button
        type="button"
        onClick={handleToggleMusic}
        aria-label={isMuted ? 'Unmute celebration music' : 'Mute celebration music'}
        className="fixed bottom-4 left-4 z-40 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] shadow-md backdrop-blur-sm transition hover:border-[var(--accent-primary)]"
      >
        {isMuted ? (
          <>
            <SpeakerSlash size={15} weight="light" />
            <span>Unmute</span>
          </>
        ) : (
          <>
            <SpeakerHigh size={15} weight="light" className="text-[var(--accent-primary)]" />
            <span>Music On</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-to-top-btn"
            type="button"
            aria-label="Scroll back to top"
            title="Scroll back to top"
            onClick={handleScrollToTop}
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.85 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25, ease: EASINGS.editorialOut }}
            className="fixed bottom-16 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)] shadow-md backdrop-blur-sm transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--linen)]"
          >
            <ArrowUp size={18} weight="light" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
