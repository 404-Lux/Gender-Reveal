import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ParentsDashboardClient } from '@/components/parents/ParentsDashboardClient';
import {
  getBabySurname,
  getCoupleNames,
  isMockModeEnabled,
  isValidParentsSlug,
} from '@/lib/env';

export const dynamic = 'force-dynamic';

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
  if (!isValidParentsSlug(params.slug)) {
    notFound();
  }

  return (
    <ParentsDashboardClient
      slug={params.slug}
      babySurname={getBabySurname()}
      coupleNames={getCoupleNames()}
      isMockMode={isMockModeEnabled()}
    />
  );
}
