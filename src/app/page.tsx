import React from 'react';
import {
  GenderRevealExperience,
  GuestFlowStage,
} from '@/components/guest/GenderRevealExperience';

export default function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const rawSurname = process.env.NEXT_PUBLIC_BABY_SURNAME;
  const babySurname =
    !rawSurname || rawSurname === 'Alonzo' ? 'Basio' : rawSurname;

  const rawCouple = process.env.NEXT_PUBLIC_COUPLE_NAMES;
  const coupleNames =
    !rawCouple || rawCouple.includes('Alonzo')
      ? 'Jazzmine & Ruhmshynne Basio'
      : rawCouple;

  const isMockMode = process.env.NEXT_PUBLIC_MOCK !== 'false';
  const rawSlug = process.env.PARENTS_SECRET_SLUG;
  const parentsSecretSlug =
    !rawSlug || rawSlug === 'alonzo-secret-2026' ? 'basio-secret-2026' : rawSlug;

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

  const requestedView = searchParams?.view as GuestFlowStage | undefined;
  const initialStage: GuestFlowStage =
    requestedView && validStages.includes(requestedView)
      ? requestedView
      : 'welcome';

  return (
    <GenderRevealExperience
      initialStage={initialStage}
      babySurname={babySurname}
      coupleNames={coupleNames}
      isMockMode={isMockMode}
      parentsSecretSlug={parentsSecretSlug}
    />
  );
}
