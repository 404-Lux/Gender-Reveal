'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from '@phosphor-icons/react';
import { soundManager, triggerHaptic } from '@/lib/sound';
import { EASINGS } from '@/lib/tokens';

/**
 * Full-viewport SVG feTurbulence noise/grain overlay (approx. 7.5% opacity)
 * + Global sound effect initialization + Floating Scroll-to-Top ("Up Arrow") button.
 */
export function PaperGrainOverlay() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    soundManager.preloadAll();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    triggerHaptic(12);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
