'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScrollTrigger } from '@/lib/gsap';
import { transitionsConfig, features, getAccentColors } from '@/data';
import {
  isKnownEffect,
  TRANSITION_EFFECT_NAMES,
  type TransitionEffectName,
} from './registry';
import type {
  TransitionContextValue,
  TransitionPayload,
  TransitionPhase,
  TriggerTransitionArgs,
} from './types';

/**
 * Coordinates a 3-phase page transition:
 *
 *   idle → exit → pending → idle
 *                  └──> phase prop flips exit→enter once pathname matches target
 *
 * - `exit`: a TransitionLink click was intercepted. Exit-phase effect plays.
 *           We write the destination accent and lock body scroll.
 *
 * - `pending`: exit finished, router.push(href) called. The effect holds its
 *              exit-end frame on screen. As soon as the URL bar catches up,
 *              TransitionStage flips its `phase` prop to 'enter' (derived from
 *              usePathname()), which triggers the enter animation through
 *              useGSAP's dependency array. No setState-in-effect needed.
 *
 * - `idle`: enter finished. Clean up (unlock scroll, ScrollTrigger.refresh).
 *
 * The same effect component handles both phases via its `phase` prop.
 */

type State =
  | { kind: 'idle' }
  | {
      kind: 'exit' | 'pending';
      effect: TransitionEffectName;
      href: string;
      target: string; // normalized pathname (no query/hash)
      origin: { x: number; y: number } | null;
      payload: TransitionPayload;
    };

interface InternalContextValue extends TransitionContextValue {
  state: State;
  onPhaseComplete: (phase: TransitionPhase) => void;
}

export const TransitionContext = createContext<InternalContextValue | null>(null);

const CSS_VAR = features.accentColorRotation.cssVariableName;

/** Dev-only override key. Read by the provider so any registered effect can
 *  be A/B tested at runtime without rebuilding. Set/cleared by DebugToggle.
 *  Safe in prod: the key just goes unread if the toggle isn't mounted. */
const EFFECT_OVERRIDE_KEY = 'transition-effect-override';

export const readEffectOverride = (): TransitionEffectName | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(EFFECT_OVERRIDE_KEY);
    return v && isKnownEffect(v) ? v : null;
  } catch {
    return null;
  }
};

export const writeEffectOverride = (
  name: TransitionEffectName | null
): void => {
  if (typeof window === 'undefined') return;
  try {
    if (name === null) {
      window.localStorage.removeItem(EFFECT_OVERRIDE_KEY);
    } else {
      window.localStorage.setItem(EFFECT_OVERRIDE_KEY, name);
    }
  } catch {
    /* localStorage unavailable — silently no-op */
  }
};

/** Source-of-truth for what the next transition will use, given the current
 *  override state and JSON default. Used by DebugToggle for its label. */
export const resolveDefaultEffect = (): TransitionEffectName => {
  const o = readEffectOverride();
  if (o) return o;
  if (isKnownEffect(transitionsConfig.defaultEffect)) {
    return transitionsConfig.defaultEffect;
  }
  return TRANSITION_EFFECT_NAMES[0] ?? ('iris-bloom' as TransitionEffectName);
};

const normalizePath = (href: string): string => {
  // Strip query/hash for pathname comparison. Keep leading slash semantics.
  try {
    // Use a dummy origin so relative hrefs parse, and so hash-only links
    // (#section) compare against the current pathname.
    const u = new URL(href, 'http://_');
    return u.pathname || '/';
  } catch {
    return href;
  }
};

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const router = useRouter();
  const scrollLockedRef = useRef(false);

  // ----- scroll lock helpers -----
  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    document.body.style.overflow = 'hidden';
  }, []);
  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    scrollLockedRef.current = false;
    document.body.style.overflow = '';
  }, []);

  // Safety net: if the user navigates somewhere we're not tracking
  // (browser back button during transition), release the lock on unmount.
  useEffect(() => () => unlockScroll(), [unlockScroll]);

  // ----- public trigger -----
  const triggerTransition = useCallback(
    ({ href, origin = null, payload, effect }: TriggerTransitionArgs) => {
      if (state.kind !== 'idle') return; // running flag — second clicks no-op

      const resolved: TransitionEffectName = (() => {
        // 1. Per-link override (highest priority)
        if (effect && isKnownEffect(effect)) return effect;
        // 2. Dev/debug runtime override from localStorage
        const override = readEffectOverride();
        if (override) return override;
        // 3. Default from data/transitions.json
        if (isKnownEffect(transitionsConfig.defaultEffect)) {
          return transitionsConfig.defaultEffect;
        }
        // 4. Defensive: registry empty / typo'd config. Skip the transition
        //    and just navigate.
        router.push(href);
        return TRANSITION_EFFECT_NAMES[0] ?? ('iris-bloom' as TransitionEffectName);
      })();

      // Mirror the destination accent into the global --color-accent-purple
      // ONLY when it's a palette color. Project `themeColor`s are pastel
      // page-tints (e.g. #e6f2ff for tasktrox) — pushing those into the
      // global accent permanently re-tints the home-page accent system after
      // the user navigates back. Effects can still read the raw value from
      // `payload.accent` for their own overlay; we just don't pollute the
      // home-screen accent state with a non-palette value.
      if (payload.accent) {
        const palette = getAccentColors();
        const incoming = payload.accent.toLowerCase();
        // Find the canonical palette entry so the var always holds the
        // case-form the palette declares — resolvePanelColor()'s
        // case-insensitive read then round-trips cleanly. Writing
        // payload.accent verbatim would leak `#62B6CB`-style mixed-case
        // values into the var on caller-side typos.
        const canonical = palette.find((c) => c.toLowerCase() === incoming);
        if (canonical) {
          document.documentElement.style.setProperty(CSS_VAR, canonical);
        }
      }

      lockScroll();
      setState({
        kind: 'exit',
        effect: resolved,
        href,
        target: normalizePath(href),
        origin,
        payload,
      });
    },
    [state.kind, router, lockScroll]
  );

  // ----- effect-driven phase advancement -----
  //
  // Side effects (router.push, ScrollTrigger.refresh, unlockScroll) must NOT
  // run inside a setState updater. React 18+ may invoke updaters during a
  // concurrent render, which would trigger a setState on Router *while
  // TransitionProvider is mid-render* — surfaced as the "Cannot update a
  // component while rendering a different component" warning.
  //
  // Instead we read the latest state from a ref (synced via effect),
  // branch imperatively, perform side effects, and call setState once with
  // the resolved next state. onPhaseComplete itself stays stable across
  // state changes (deps unchanged).
  //
  // Sync-via-effect is safe here because onPhaseComplete is only invoked
  // from a GSAP timeline's onComplete callback, which fires on a rAF tick
  // after React has committed — the ref is guaranteed to be up to date.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const onPhaseComplete = useCallback(
    (phase: TransitionPhase) => {
      const s = stateRef.current;
      if (s.kind === 'idle') return;

      if (phase === 'exit' && s.kind === 'exit') {
        // Exit done. Flip to 'pending' first so the effect holds its
        // exit-end frame, then kick the route change. TransitionStage will
        // flip the effect's `phase` prop to 'enter' as soon as
        // usePathname() catches up with our target.
        setState({ ...s, kind: 'pending' });
        router.push(s.href);
        return;
      }

      if (phase === 'enter' && s.kind === 'pending') {
        // Refresh ScrollTrigger so the new page's pinned sections compute
        // their offsets against the now-visible document height.
        ScrollTrigger.refresh();
        unlockScroll();

        // Hash handoff: if the original href included an #anchor (e.g.
        // Menu cross-route from /work/foo → /#projects), scroll the new
        // page to that anchor. router.push('/#projects') doesn't auto-
        // scroll when the destination pathname is already showing, so we
        // do it explicitly here. Native scrollIntoView is intercepted by
        // Lenis when active, so the scroll picks up the project's smooth
        // behavior without us depending on the Lenis context.
        try {
          const u = new URL(s.href, 'http://_');
          if (u.hash) {
            requestAnimationFrame(() => {
              const el = document.querySelector(u.hash);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }
        } catch {
          /* malformed href — skip hash scroll */
        }

        setState({ kind: 'idle' });
      }
    },
    [router, unlockScroll]
  );

  // ----- browser-back interception on case-study routes -----
  //
  // TransitionLink covers click-driven navigation, but a hardware/browser
  // back button doesn't go through it and would otherwise pop straight to
  // home with no curtain. We listen for popstate while on /work/* and, if
  // the pop is *leaving* the case-study namespace, synchronously push the
  // case-study URL back on top of the history stack (URL bar is restored
  // before paint) and trigger the curtain home via the provider's normal
  // state machine.
  //
  // We intentionally do NOT push a sentinel on mount. The earlier design
  // did, which made `/work/*` mounts pollute history (BL-01) and orphaned
  // a sentinel on TransitionLink-driven exits — pressing browser-Back from
  // home would silently bounce the user back to the case study (BL-02).
  // Reacting only at pop-time avoids both bugs and keeps history clean.
  const pathname = usePathname();
  const triggerRef = useRef(triggerTransition);
  useEffect(() => {
    triggerRef.current = triggerTransition;
  }, [triggerTransition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pathname || !pathname.startsWith('/work/')) return;

    // Snapshot the URL at-mount; if the user navigates between case
    // studies, the effect re-runs and a new caseStudyUrl is captured.
    const caseStudyUrl = window.location.href;

    const onPopState = () => {
      // After popstate, location.pathname reflects the destination of the
      // pop. If we're still on a /work/* path (e.g., back between case
      // studies, in-page hash pop), let Next.js handle it natively.
      if (window.location.pathname.startsWith('/work/')) return;

      // If a transition is mid-flight, the curtain is already covering
      // the view. Don't double-trigger — let the in-flight transition
      // complete naturally to wherever it was heading. The user's Back
      // press was lost; preferable to silently polluting history with a
      // failed re-arm (CR-01).
      if (stateRef.current.kind !== 'idle') return;

      // Restore the case-study URL synchronously so the destination
      // doesn't flash through before the curtain covers it.
      window.history.pushState(null, '', caseStudyUrl);

      // Read the live accent from the CSS var so cur2 (which resolves
      // via --color-accent-purple) renders the color the user was
      // looking at. Direct DOM read avoids hook dep churn that would
      // re-register the listener on every accent cycle.
      const live = getComputedStyle(document.documentElement)
        .getPropertyValue(CSS_VAR)
        .trim();
      const palette = getAccentColors();
      triggerRef.current({
        href: '/',
        origin: null,
        payload: { accent: live || palette[0] },
      });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [pathname]);

  const value = useMemo<InternalContextValue>(
    () => ({
      isTransitioning: state.kind !== 'idle',
      triggerTransition,
      state,
      onPhaseComplete,
    }),
    [state, triggerTransition, onPhaseComplete]
  );

  return (
    <TransitionContext.Provider value={value}>
      {children}
    </TransitionContext.Provider>
  );
}
