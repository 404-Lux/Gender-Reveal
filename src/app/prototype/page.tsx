import React from 'react';
import { notFound } from 'next/navigation';
import { GenderRevealExperience } from '@/components/guest/GenderRevealExperience';
import {
  getBabySurname,
  getCoupleNames,
  getParentsSlug,
  isMockModeEnabled,
} from '@/lib/env';

export default function BalloonPopPrototypePage() {
  const isMockMode = isMockModeEnabled();

  if (!isMockMode) {
    notFound();
  }

  return (
    <GenderRevealExperience
      initialStage="prototype"
      babySurname={getBabySurname()}
      coupleNames={getCoupleNames()}
      isMockMode={isMockMode}
      parentsSecretSlug={getParentsSlug() || ''}
    />
  );
}
