'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { EASINGS, RevealGender } from '@/lib/tokens';
import { FamilySide } from '@/lib/serverStore';
import { soundManager, triggerHaptic } from '@/lib/sound';
import {
  TeamPaperCardArt,
  WaxSealSvg,
  PaperOrnamentDivider,
} from '@/components/shared/PaperIllustrations';
import {
  EditorialInput,
  SplitText,
  TactileButton,
} from '@/components/shared/MotionPrimitives';

const QUICK_ROLES = [
  'Ninang',
  'Ninong',
  'Tita',
  'Tito',
  'Lola',
  'Lolo',
  'Cousin',
  'Family Friend',
] as const;

export interface GuessStageProps {
  initialName?: string;
  initialRelationship?: string;
  initialSide?: FamilySide;
  initialGuess?: RevealGender | null;
  babySurname: string;
  onBack: () => void;
  onSubmitGuess: (data: {
    name: string;
    relationship: string;
    side: FamilySide;
    guess: RevealGender;
  }) => Promise<void>;
}

export function GuessStage({
  initialName = '',
  initialRelationship = '',
  initialSide,
  babySurname,
  onBack,
  onSubmitGuess,
}: GuessStageProps) {
  const [name, setName] = useState(initialName);
  const [side, setSide] = useState<FamilySide | null>(initialSide ?? null);
  const [relationship, setRelationship] = useState(initialRelationship);
  // Always start with NO team pre-selected so neither Boy nor Girl is chosen until the guest taps one
  const [selectedTeam, setSelectedTeam] = useState<RevealGender | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCard = (team: RevealGender) => {
    triggerHaptic(18);
    soundManager.play('seal', team === 'boy' ? 0.96 : 1.06);
    setSelectedTeam(team);
    setError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;

    if (name.trim().length < 2) {
      setError('Please enter your name first.');
      return;
    }
    if (!side) {
      setError("Please select whether you're on Jazzmine's side, Ruhmshynne's side, or both.");
      return;
    }
    if (!selectedTeam) {
      setError('Please tap Team Boy or Team Girl below.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmitGuess({
        name: name.trim(),
        relationship: relationship.trim(),
        side,
        guess: selectedTeam,
      });
    } catch {
      setError('Could not save your guess right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Cast Your Guess"
      className="mx-auto w-full max-w-2xl py-2 sm:py-6"
    >
      <form
        onSubmit={handleFormSubmit}
        className="paper-card-surface mx-auto flex flex-col items-center rounded-[32px] px-5 py-8 sm:px-10 sm:py-10 space-y-7 text-center"
      >
        <input
          type="text"
          name="_hp"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        {/* Centered Header */}
        <div className="flex flex-col items-center space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            Step 1 of 2 · Your Guess
          </span>
          <SplitText
            text={`Celebrating Baby ${babySurname}`}
            mode="words"
            className="font-display-editorial text-3xl sm:text-4xl text-[var(--text-primary)]"
          />
          <p className="max-w-md text-xs sm:text-sm text-[var(--text-secondary)]">
            Enter your name, choose whose side you&apos;re joining from, and pick your team.
          </p>
        </div>

        {/* 1. Guest Name */}
        <div className="w-full space-y-5">
          <EditorialInput
            id="guest-name-input"
            label="Your Name"
            placeholder="e.g. Tita Maricel or Ninong Carlo"
            value={name}
            onChange={setName}
            required
          />

          {/* 2. Family Side Selector (Mother: Jazzmine / Father: Ruhmshynne / Both) */}
          <div className="w-full space-y-2 text-left">
            <span className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Which Side Are You Joining From? *
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    id: 'mother' as const,
                    label: "Mother's Side",
                    sublabel: 'Jazzmine',
                  },
                  {
                    id: 'father' as const,
                    label: "Father's Side",
                    sublabel: 'Ruhmshynne',
                  },
                  {
                    id: 'both' as const,
                    label: 'Both Sides',
                    sublabel: 'Jazzmine & Ruhmshynne',
                  },
                ] as const
              ).map((option) => {
                const active = side === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      setSide(option.id);
                      setError(null);
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border px-3 py-2.5 text-center transition ${
                      active
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--linen)] shadow-xs'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 text-[var(--text-primary)] hover:border-[var(--accent-primary)]/60'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold">
                      {option.label}
                    </span>
                    <span
                      className={`text-[10px] ${
                        active ? 'text-white/85' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {option.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Optional Relationship Role to the Baby */}
          <div className="w-full space-y-2 text-left">
            <span className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Your Role to Baby {babySurname} (Optional — Tap One)
            </span>
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
              {QUICK_ROLES.map((role) => {
                const isSelected =
                  relationship.toLowerCase() === role.toLowerCase();
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setRelationship(isSelected ? '' : role);
                    }}
                    className={`min-h-[36px] rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--linen)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <PaperOrnamentDivider />

        {/* Two Symmetrical, Straight Illustrated Cards */}
        <div className="w-full space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Choose Your Team *
          </p>

          <div
            role="radiogroup"
            aria-label="Choose Team Boy or Team Girl"
            className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {(
              [
                {
                  team: 'boy' as const,
                  title: 'Team Boy',
                  subtitle: 'The Little Voyager',
                  sealLabel: 'B',
                },
                {
                  team: 'girl' as const,
                  title: 'Team Girl',
                  subtitle: 'The Little Dreamer',
                  sealLabel: 'G',
                },
              ] as const
            ).map((card) => {
              const isSelected = selectedTeam === card.team;
              return (
                <motion.button
                  key={card.team}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectCard(card.team)}
                  animate={{
                    y: isSelected ? -4 : 0,
                    scale: isSelected ? 1.01 : 1,
                  }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={EASINGS.springSoft}
                  className={`relative flex min-h-[260px] w-full flex-col items-center justify-between rounded-2xl border p-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                    isSelected
                      ? 'border-2 border-[var(--accent-primary)] bg-[var(--linen)] shadow-md'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-primary)]/50 hover:border-[var(--accent-primary)]/60'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="font-script-note text-xl text-[var(--accent-primary)]">
                      {card.subtitle}
                    </span>
                    <h3 className="font-display-editorial text-2xl sm:text-3xl text-[var(--text-primary)]">
                      {card.title}
                    </h3>
                  </div>

                  <div className="my-3 flex items-center justify-center">
                    <TeamPaperCardArt team={card.team} selected={isSelected} />
                  </div>

                  <div className="flex h-12 w-full items-center justify-center">
                    {isSelected ? (
                      <motion.div
                        initial={{ scale: 1.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={EASINGS.springTactile}
                        className="flex items-center justify-center"
                      >
                        <WaxSealSvg size={42} label={card.sealLabel} />
                      </motion.div>
                    ) : (
                      <span className="inline-block rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-1 text-[11px] font-medium uppercase tracking-widest text-[var(--text-secondary)]">
                        Tap to Select
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="text-center text-xs font-medium text-[var(--accent-primary)]"
          >
            {error}
          </p>
        )}

        {/* Centered Navigation Footer */}
        <div className="flex w-full flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-6">
          <TactileButton
            variant="ghost"
            onClick={onBack}
            className="w-full sm:w-auto"
          >
            <ArrowLeft size={16} weight="light" />
            <span>Back</span>
          </TactileButton>

          <TactileButton
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            <span>{submitting ? 'Saving...' : 'Continue to Wishes'}</span>
            <ArrowRight size={16} weight="light" />
          </TactileButton>
        </div>
      </form>
    </section>
  );
}
