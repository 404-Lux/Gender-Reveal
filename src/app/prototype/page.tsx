import React from 'react';
import { GenderRevealExperience } from '@/components/guest/GenderRevealExperience';

export default function BalloonPopPrototypePage() {
  const rawSurname = process.env.NEXT_PUBLIC_BABY_SURNAME;
  const babySurname =
    !rawSurname || rawSurname === 'Alonzo' ? 'Basio' : rawSurname;

  const rawCouple = process.env.NEXT_PUBLIC_COUPLE_NAMES;
  const coupleNames =
    !rawCouple || rawCouple.includes('Alonzo')
      ? 'Jazzmine & Ruhmshynne Basio'
      : rawCouple;

  const isMockMode = process.env.NEXT_PUBLIC_MOCK === 'true';
  const rawSlug = process.env.PARENTS_SECRET_SLUG;
  const parentsSecretSlug =
    !rawSlug || rawSlug === 'alonzo-secret-2026' ? 'basio-secret-2026' : rawSlug;

  return (
    <GenderRevealExperience
      initialStage="prototype"
      babySurname={babySurname}
      coupleNames={coupleNames}
      isMockMode={isMockMode}
      parentsSecretSlug={parentsSecretSlug}
    />
  );
}
