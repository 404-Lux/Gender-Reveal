import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ParentsDashboardClient } from '@/components/parents/ParentsDashboardClient';

export const metadata: Metadata = {
  title: 'Parents Sanctuary — Baby Basio Gender Reveal',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ParentsSecretPage({
  params,
}: {
  params: { slug: string };
}) {
  const expectedSlug = process.env.PARENTS_SECRET_SLUG || 'basio-secret-2026';
  const isAllowedSlug =
    params.slug === expectedSlug ||
    params.slug === 'basio-secret-2026' ||
    params.slug === 'alonzo-secret-2026';

  if (!isAllowedSlug) {
    notFound();
  }

  const rawSurname = process.env.NEXT_PUBLIC_BABY_SURNAME;
  const babySurname =
    !rawSurname || rawSurname === 'Alonzo' ? 'Basio' : rawSurname;

  const rawCouple = process.env.NEXT_PUBLIC_COUPLE_NAMES;
  const coupleNames =
    !rawCouple || rawCouple.includes('Alonzo')
      ? 'Jazzmine & Ruhmshynne Basio'
      : rawCouple;

  const isMockMode = process.env.NEXT_PUBLIC_MOCK !== 'false';

  return (
    <ParentsDashboardClient
      slug={params.slug}
      babySurname={babySurname}
      coupleNames={coupleNames}
      isMockMode={isMockMode}
    />
  );
}
