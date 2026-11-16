'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { EASINGS } from '@/lib/tokens';
import { triggerHaptic } from '@/lib/sound';

/**
 * SplitText — Reveals editorial headlines with clean, straight, centered word/character masks.
 * Uses flex-wrap justify-center so multi-line headings remain 100% centered with zero horizontal offset.
 */
export function SplitText({
  text,
  mode = 'words',
  className = '',
  delay = 0,
  stagger = 0.04,
  as: Tag = 'h1',
}: {
  text: string;
  mode?: 'words' | 'chars';
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}) {
  const prefersReduced = useReducedMotion();
  const words = text.trim().split(/\s+/);

  if (prefersReduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  if (mode === 'chars') {
    const chars = Array.from(text);
    return (
      <Tag
        className={`inline-flex flex-wrap items-baseline justify-center ${className}`}
        aria-label={text}
      >
        {chars.map((ch, idx) => (
          <span
            key={`${ch}-${idx}`}
            className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em]"
            aria-hidden="true"
          >
            <motion.span
              className="inline-block will-change-transform"
              initial={{ y: '105%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: delay + idx * stagger,
                ease: EASINGS.editorialOut,
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag
      className={`flex flex-wrap items-baseline justify-center gap-x-[0.26em] gap-y-1 text-center ${className}`}
      aria-label={text}
    >
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em]"
          aria-hidden="true"
        >
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: '105%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 0.62,
              delay: delay + idx * stagger,
              ease: EASINGS.editorialOut,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * RollingNumber — Clean centered rolling/flipping digit display for countdowns & tallies
 */
export function RollingNumber({
  value,
  pad = 2,
  className = '',
}: {
  value: number;
  pad?: number;
  className?: string;
}) {
  const formatted = String(Math.max(0, value)).padStart(pad, '0');
  const digits = Array.from(formatted);

  return (
    <span className={`inline-flex items-center justify-center tabular-nums ${className}`}>
      {digits.map((digit, index) => (
        <span
          key={index}
          className="relative inline-flex h-[1.15em] min-w-[0.62em] overflow-hidden items-center justify-center"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${index}-${digit}`}
              initial={{ y: '90%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '-90%', opacity: 0 }}
              transition={{
                duration: 0.36,
                ease: EASINGS.editorialOut,
              }}
              className="inline-block text-center will-change-transform"
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

/**
 * TactileButton — Perfectly straight, centered button with press-down squash & spring-back
 * and touch-point ripple (no off-center magnetic drift).
 */
export function TactileButton({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    triggerHaptic(14);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
      const id = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-2), { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }
    onClick?.(e);
  };

  const variantClasses = {
    primary:
      'bg-[var(--accent-primary)] text-[var(--linen)] border border-transparent shadow-sm hover:brightness-[1.04]',
    secondary:
      'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--accent-primary)]',
    outline:
      'bg-transparent text-[var(--text-primary)] border border-[var(--text-primary)]/30 hover:border-[var(--text-primary)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent',
  }[variant];

  return (
    <motion.button
      ref={btnRef}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={handleClick}
      whileHover={disabled ? undefined : { y: -1.5 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={EASINGS.springTactile}
      className={`relative inline-flex min-h-[48px] items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 py-3 text-sm font-medium tracking-wide text-center transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses} ${className}`}
    >
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 3.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: EASINGS.editorialOut }}
            style={{
              left: r.x,
              top: r.y,
              width: 56,
              height: 56,
              marginLeft: -28,
              marginTop: -28,
            }}
            className="pointer-events-none absolute rounded-full bg-white/40"
          />
        ))}
      </AnimatePresence>
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

/**
 * EditorialInput — Clean, balanced input with clear label and animated underline.
 */
export function EditorialInput({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  maxLength = 80,
  className = '',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isComplete = value.trim().length >= 2;

  return (
    <div className={`w-full text-left ${className}`}>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1.5"
      >
        {label}
        {required && <span className="ml-1 text-[var(--accent-primary)]">*</span>}
      </label>

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 px-4 py-3 pr-10 text-base font-medium text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-secondary)]/55 focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none transition-colors"
        />

        <AnimatePresence>
          {isComplete && (
            <motion.svg
              key="check"
              width="18"
              height="18"
              viewBox="0 0 22 22"
              fill="none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="pointer-events-none absolute right-3.5 text-[var(--accent-primary)]"
            >
              <motion.path
                d="M4.5 11.5L9 16L17.5 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: EASINGS.editorialOut }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={false}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.35, ease: EASINGS.editorialOut }}
        style={{ originX: 0.5 }}
        className="mx-auto -mt-[2px] h-[2px] w-[94%] rounded-full bg-[var(--accent-primary)]"
      />
    </div>
  );
}

/**
 * CurtainStageTransition — Smooth, centered stage transition
 */
export function CurtainStageTransition({
  stageKey,
  children,
}: {
  stageKey: string;
  children: React.ReactNode;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div key={stageKey}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stageKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{
          duration: 0.45,
          ease: EASINGS.editorialOut,
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
