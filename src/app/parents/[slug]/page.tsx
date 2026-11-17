import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ParentsDashboardClient,
  ParentsDashboardData,
} from '@/components/parents/ParentsDashboardClient';
import { callAppsScriptProxy } from '@/lib/appsScriptProxy';
import { buildParentsStatePayload } from '@/lib/serverStore';
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

export default async function ParentsSecretPage({
  params,
}: {
  params: { slug: string };
}) {
  if (!isValidParentsSlug(params.slug)) {
    notFound();
  }

  let initialData: ParentsDashboardData | null = null;
  try {
    const remote = await callAppsScriptProxy<Record<string, unknown>>(
      'POST',
      'getParentsData',
      { slug: params.slug }
    );
    if (remote && remote.revealTime) {
      initialData = remote as unknown as ParentsDashboardData;
    } else if (isMockModeEnabled()) {
      initialData = buildParentsStatePayload() as ParentsDashboardData;
    }
  } catch {
    if (isMockModeEnabled()) {
      initialData = buildParentsStatePayload() as ParentsDashboardData;
    }
  }

  return (
    <ParentsDashboardClient
      slug={params.slug}
      babySurname={getBabySurname()}
      coupleNames={getCoupleNames()}
      isMockMode={isMockModeEnabled()}
      initialData={initialData}
    />
  );
}
