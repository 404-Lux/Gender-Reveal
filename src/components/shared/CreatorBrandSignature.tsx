'use client';

import React from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';

export const CREATOR_BRAND_NAME = 'Harra Ramos';
export const CREATOR_PORTFOLIO_URL =
  process.env.NEXT_PUBLIC_PORTFOLIO_URL || 'https://tapkonek-ph.vercel.app/harra';
export const CREATOR_PORTFOLIO_DISPLAY = 'tapkonek-ph.vercel.app/harra';

export function CreatorBrandSignature({
  portfolioUrl = CREATOR_PORTFOLIO_URL,
}: {
  variant?: 'footer' | 'photobooth';
  portfolioUrl?: string;
}) {
  return (
    <div className="mt-2.5 flex flex-col items-center justify-center pt-2.5 border-t border-[var(--border-hairline)]/60">
      <a
        href={portfolioUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/80 px-3.5 py-1 text-[11px] transition hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface)]"
      >
        <span className="text-[var(--text-secondary)]">
          Designed &amp; Built by{' '}
          <strong className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            {CREATOR_BRAND_NAME}
          </strong>
        </span>
        <ArrowUpRight
          size={12}
          weight="light"
          className="text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors"
        />
      </a>
    </div>
  );
}
