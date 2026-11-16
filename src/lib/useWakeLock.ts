'use client';

import { useEffect } from 'react';

interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Keeps the screen awake during the Waiting Room final stretch and Balloon Reveal
 * on supported mobile browsers, with automatic re-acquire on visibilitychange.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;
    const nav = navigator as unknown as NavigatorWithWakeLock;
    if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (cancelled || document.visibilityState !== 'visible') return;
        sentinel = await nav.wakeLock!.request('screen');
      } catch {
        // Silently ignore (low battery mode, unsupported in-app browser, etc.)
      }
    };

    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
      }
    };
  }, [active]);
}
