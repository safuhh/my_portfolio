'use client';

import Link from 'next/link';
import { forwardRef, useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { useTransition } from './useTransition';
import type { TransitionPayload } from './types';
import type { TransitionEffectName } from './registry';

export interface TransitionLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  /**
   * Always a string URL. Tightened from `LinkProps['href']` because the
   * UrlObject branch caused same-path query clicks to be misclassified as
   * "same page" when no `pathname` was supplied. All call sites pass strings.
   */
  href: string;
  payload: TransitionPayload;
  /** Override the default transition effect for this link. */
  effect?: TransitionEffectName;
  /** Pass-through to next/link. */
  prefetch?: boolean;
  /** Optional click handler — runs *before* the transition is triggered.
   *  Useful for analytics. Call event.preventDefault() inside to suppress
   *  the transition (the link will then navigate normally via next/link). */
  onBeforeTransition?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/** Heuristic: don't intercept the click if the user is trying to open
 *  the link in a new tab/window or trigger a contextual action. */
function isModifiedClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
    // Middle-click or right-click
    e.button !== 0
  );
}

/**
 * Drop-in replacement for `next/link` that plays a registered transition
 * before navigating. Falls back to standard navigation on:
 *   - modified clicks (cmd/ctrl/shift/alt, middle/right)
 *   - same-pathname clicks (no route change)
 *   - explicit preventDefault from onBeforeTransition
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink(
    { href, payload, effect, onBeforeTransition, children, ...rest },
    ref
  ) {
    const { triggerTransition, isTransitioning } = useTransition();

    const handleClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        onBeforeTransition?.(e);
        if (e.defaultPrevented) return;
        if (isModifiedClick(e)) return;
        if (isTransitioning) {
          // Already transitioning — eat the click so we don't queue navigations.
          e.preventDefault();
          return;
        }

        // Same-page nav: let next/link handle it (router noop, scroll behavior intact).
        const currentPath = window.location.pathname;
        const targetPath = (() => {
          try { return new URL(href, window.location.origin).pathname; }
          catch { return href; }
        })();
        if (targetPath === currentPath) return;

        e.preventDefault();
        triggerTransition({
          href,
          origin: { x: e.clientX, y: e.clientY },
          payload,
          effect,
        });
      },
      [href, payload, effect, onBeforeTransition, triggerTransition, isTransitioning]
    );

    return (
      <Link
        ref={ref}
        href={href}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }
);

TransitionLink.displayName = 'TransitionLink';
