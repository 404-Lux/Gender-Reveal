import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[85dvh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center space-y-5">
      <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent-primary)]">
        404 · Page Not Found
      </span>
      <h1 className="font-display-editorial text-4xl sm:text-5xl text-[var(--text-primary)]">
        This paper envelope is elsewhere
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
        We couldn&apos;t find the page you were looking for. Head back to the
        invitation cover to join the celebration.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[var(--accent-primary)] px-7 py-3 text-sm font-medium text-[var(--linen)] transition hover:brightness-105"
      >
        Return to Invitation Cover
      </Link>
    </main>
  );
}
