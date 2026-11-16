'use client';

import React, { useEffect, useState } from 'react';
import { Browser, Copy, Check, X } from '@phosphor-icons/react';
import { triggerHaptic } from '@/lib/sound';

/**
 * Detects Messenger, Instagram, Facebook, Viber, TikTok, LINE, or WeChat in-app WebViews
 * that commonly block file downloads (PNG, PDF, ICS) and live camera access.
 */
export function detectInAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) {
    return /Messenger/i.test(ua) ? 'Messenger' : 'Messenger / Facebook';
  }
  if (/Viber/i.test(ua)) return 'Viber';
  if (/BytedanceWebview|TikTok|musical_ly/i.test(ua)) return 'TikTok';
  if (/Line\//i.test(ua)) return 'LINE';
  if (/MicroMessenger/i.test(ua)) return 'WeChat';
  return null;
}

export function InAppBrowserGuard({
  context = 'general',
}: {
  context?: 'general' | 'photobooth';
}) {
  const [appName, setAppName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAppName(detectInAppBrowser());
  }, []);

  if (!appName || dismissed) return null;

  const handleCopyUrl = async () => {
    triggerHaptic(12);
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  return (
    <div
      role="alert"
      className="paper-card-surface mx-auto w-full max-w-3xl rounded-2xl border border-[var(--accent-primary)]/45 border-l-4 border-l-[var(--accent-primary)] p-3.5 sm:p-4 text-left shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
          <Browser size={18} weight="light" />
        </div>

        <div className="flex-1 space-y-2 text-xs leading-relaxed">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-[var(--text-primary)]">
              Opened inside {appName} — Downloads &amp; Camera May Be Blocked
            </p>
            {context === 'general' && (
              <button
                type="button"
                aria-label="Dismiss browser notice"
                onClick={() => setDismissed(true)}
                className="rounded-full p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} weight="light" />
              </button>
            )}
          </div>

          <p className="text-[var(--text-secondary)]">
            In-app browsers like {appName} block saving photos, PDFs, and
            camera access. Tap the{' '}
            <strong className="text-[var(--text-primary)]">
              menu (&hellip; or &#8942;)
            </strong>{' '}
            in the top corner and select{' '}
            <strong className="text-[var(--text-primary)]">
              Open in Chrome / Safari
            </strong>
            , or copy the link below to open in your main browser.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1 text-[11px] font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]"
            >
              {copied ? (
                <>
                  <Check size={13} weight="bold" className="text-[var(--accent-primary)]" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} weight="light" className="text-[var(--accent-primary)]" />
                  <span>Copy Link for Chrome / Safari</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
