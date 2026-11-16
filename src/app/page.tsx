import React from 'react';
import { GenderRevealExperience } from '@/components/guest/GenderRevealExperience';
import {
  getBabySurname,
  getCoupleNames,
  getParentsSlug,
  isMockModeEnabled,
} from '@/lib/env';

export default function HomePage() {
  const isMockMode = isMockModeEnabled();

  return (
    <GenderRevealExperience
      initialStage="welcome"
      babySurname={getBabySurname()}
      coupleNames={getCoupleNames()}
      isMockMode={isMockMode}
      parentsSecretSlug={isMockMode ? getParentsSlug() || '' : ''}
    />
  );
}
