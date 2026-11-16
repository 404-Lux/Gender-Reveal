'use client';

import React from 'react';

interface RevealErrorBoundaryProps {
  children: React.ReactNode;
}

interface RevealErrorBoundaryState {
  hasError: boolean;
}

export class RevealErrorBoundary extends React.Component<
  RevealErrorBoundaryProps,
  RevealErrorBoundaryState
> {
  constructor(props: RevealErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): RevealErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('RevealErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="paper-card-surface mx-auto max-w-md rounded-[28px] p-8 text-center space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-primary)]">
            Reveal Stage
          </p>
          <h2 className="font-display-editorial text-2xl text-[var(--text-primary)]">
            Let&apos;s reload the reveal
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Your connection or browser paused the animation. Tap reload to
            continue right where you left off.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-[var(--linen)] transition hover:opacity-90"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
