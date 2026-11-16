'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[75dvh] max-w-lg flex-col items-center justify-center px-6 py-12 text-center space-y-5">
      <div className="paper-card-surface w-full rounded-[28px] p-8 space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          One Moment Please
        </p>
        <h1 className="font-display-editorial text-2xl sm:text-3xl text-[var(--text-primary)]">
          Something paused on this page
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Your saved name, guess, and wishes are still safe on this device. Tap
          below to refresh cleanly.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-[var(--linen)] transition hover:opacity-90"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
          >
            Reload Page
          </button>
        </div>
      </div>
    </main>
  );
}
