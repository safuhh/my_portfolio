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
import { useRouter } from 'next/navigation';
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
        const inPalette = palette.some((c) => c.toLowerCase() === incoming);
        if (inPalette) {
          document.documentElement.style.setProperty(CSS_VAR, payload.accent);
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
  const onPhaseComplete = useCallback(
    (phase: TransitionPhase) => {
      setState((s) => {
        if (s.kind === 'idle') return s;
        if (phase === 'exit' && s.kind === 'exit') {
          // Exit done. Kick off navigation; hold the curtain up via 'pending'.
          // TransitionStage will flip the effect's `phase` prop to 'enter'
          // as soon as usePathname() catches up with our target.
          router.push(s.href);
          return { ...s, kind: 'pending' };
        }
        if (phase === 'enter' && s.kind === 'pending') {
          // Done. Refresh ScrollTrigger so the new page's pinned sections
          // compute their offsets against the now-visible document height.
          ScrollTrigger.refresh();
          unlockScroll();
          return { kind: 'idle' };
        }
        return s;
      });
    },
    [router, unlockScroll]
  );

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
