'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { gsap, ANIMATION_CONFIG } from '@/lib/gsap';
import { transitionsConfig, getAccentColors } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { TransitionEffectProps } from '../../types';
import styles from './ColorCurtainStack.module.css';

/**
 * Color Curtain Stack — three full-screen panels slide in from different
 * vectors and stack on top of each other, hiding the outgoing page; then
 * they peel off in reverse to reveal the new one.
 *
 * Adapted from the `04-color-curtain-stack.html` prototype:
 * - Split into exit / enter phases driven by `TransitionProvider`
 * - Stripe-track scroll runs via CSS @keyframes (not GSAP infinite tweens)
 *   so it survives the phase-change unmount cleanly
 * - Standard easings from `ANIMATION_CONFIG` (no CustomEase registration)
 * - Reduced-motion crossfade fallback
 * - Cur2's background sourced strictly from the existing `accentPalette`;
 *   slug-hash fallback if `payload.accent` isn't a palette entry, so no new
 *   colors enter the system.
 *
 * Why `useLayoutEffect` + a tween-tracking ref pair instead of
 * `@gsap/react`'s `useGSAP`: React 18 Strict Mode (Next.js default in dev)
 * mounts → unmounts → remounts the effect in one tick. `useGSAP`'s internal
 * scope/context bookkeeping doesn't always recover from that double-mount
 * for portaled children (the second timeline is created but never ticks).
 * We collect spawned animations into an array, then kill exactly those on
 * cleanup — no shared GSAP context state to confuse.
 */

const INK = '#1b2028';

/** Read the current site accent (the one the home-screen cycle is showing
 *  right now) from --color-accent-purple. Validate it's a palette entry so
 *  we never paint a stray inline value on the panel; otherwise fall back to
 *  the first palette color. SSR-safe via the window guard. */
function resolvePanelColor(): string {
  const palette = getAccentColors();
  if (palette.length === 0) return INK;
  if (typeof window === 'undefined') return palette[0];
  const current = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent-purple')
    .trim()
    .toLowerCase();
  if (current && palette.some((c) => c.toLowerCase() === current)) {
    return current;
  }
  return palette[0];
}

interface CurtainConfig {
  background: string;
  textWord: string;
  textTone: 'ink' | 'paper';
  labelTone: 'ink' | 'paper';
  scrollClass: string;
  labels: { tl?: string; tr?: string; bl?: string; br?: string };
}

function buildCurtains(payload: TransitionEffectProps['payload']): CurtainConfig[] {
  const title = payload.title?.trim() || 'Studio';
  const year = payload.year || '';
  const category = payload.category || 'Case Study';
  const titleHead = title.split(/\s+/)[0] || title;
  const titleTail = title.split(/\s+/).slice(1).join(' ') || category;
  const panelColor = resolvePanelColor();

  return [
    {
      background: INK,
      textWord: titleHead,
      textTone: 'ink',
      labelTone: 'paper',
      scrollClass: styles.trackScrollLeft,
      labels: { tl: 'Curtain · 01', br: 'M.A · Studio' },
    },
    {
      background: panelColor,
      textWord: titleTail || titleHead,
      textTone: 'paper',
      labelTone: 'ink',
      scrollClass: styles.trackScrollRight,
      labels: {
        tr: [year, category].filter(Boolean).join(' · '),
        bl: title,
      },
    },
    {
      background: INK,
      textWord: titleHead,
      textTone: 'ink',
      labelTone: 'paper',
      scrollClass: styles.trackScrollLeftFast,
      labels: { tl: title, br: year || 'Now' },
    },
  ];
}

function getCurtainConfig() {
  const root =
    (transitionsConfig.effects?.['color-curtain-stack'] ?? {}) as Record<
      string,
      unknown
    >;
  const num = (k: string, fallback: number): number =>
    typeof root[k] === 'number' ? (root[k] as number) : fallback;
  return {
    exitDuration: num('exitDuration', 1.4),
    enterDuration: num('enterDuration', 1.4),
    holdDuration: num('holdDuration', 0.35),
    stagger: num('stagger', 0.18),
  };
}

export function ColorCurtainStack({
  phase,
  payload,
  onComplete,
}: TransitionEffectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const curtains = useMemo(() => buildCurtains(payload), [payload]);

  // The provider hands us a fresh `onComplete` arrow on every render. We
  // park the latest in a ref so the GSAP timeline can always call the
  // current one without us having to include `onComplete` in the effect
  // deps — including it would tear down the timeline mid-flight on the
  // next parent render.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cur1 = root.querySelector<HTMLDivElement>(`.${styles.cur1}`);
    const cur2 = root.querySelector<HTMLDivElement>(`.${styles.cur2}`);
    const cur3 = root.querySelector<HTMLDivElement>(`.${styles.cur3}`);
    if (!cur1 || !cur2 || !cur3) return;

    const allLabels = root.querySelectorAll<HTMLDivElement>(`.${styles.label}`);
    const labelsOf = (c: HTMLElement) =>
      c.querySelectorAll<HTMLDivElement>(`.${styles.label}`);

    const fireComplete = () => onCompleteRef.current();
    const animations: Array<gsap.core.Tween | gsap.core.Timeline> = [];

    // ---------- Reduced-motion: simple crossfade ----------
    if (reduceMotion) {
      const tween = phase === 'exit'
        ? gsap.fromTo(
            root,
            { opacity: 0 },
            {
              opacity: 1,
              duration: transitionsConfig.reducedMotionDuration,
              ease: 'power2.out',
              onComplete: fireComplete,
            }
          )
        : gsap.to(root, {
            opacity: 0,
            duration: transitionsConfig.reducedMotionDuration,
            ease: 'power2.in',
            onComplete: fireComplete,
          });
      if (phase === 'exit') {
        gsap.set([cur1, cur2, cur3], { xPercent: 0, yPercent: 0 });
      }
      animations.push(tween);
      return () => animations.forEach((a) => a.kill());
    }

    const cfg = getCurtainConfig();
    const slide = Math.max(0.5, cfg.exitDuration - cfg.stagger * 2);
    const ease = ANIMATION_CONFIG.ease.inOutQuart;

    if (phase === 'exit') {
      gsap.set(cur1, { yPercent: -101 });
      gsap.set(cur2, { xPercent: 101 });
      gsap.set(cur3, { yPercent: 101 });
      gsap.set(allLabels, { opacity: 0, y: 8 });

      const tl = gsap.timeline({ onComplete: fireComplete });
      animations.push(tl);

      tl.to(cur1, { yPercent: 0, duration: slide, ease }, 0);
      tl.to(labelsOf(cur1), { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, 0.35);

      tl.to(cur2, { xPercent: 0, duration: slide, ease }, cfg.stagger);
      tl.to(labelsOf(cur2), { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, cfg.stagger + 0.35);

      tl.to(cur3, { yPercent: 0, duration: slide, ease }, cfg.stagger * 2);
      tl.to(labelsOf(cur3), { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, cfg.stagger * 2 + 0.35);

      // Hold while the three are stacked — covers router.push and the
      // React re-render of the destination route.
      tl.to({}, { duration: cfg.holdDuration });
    } else {
      // ---------- enter ----------
      gsap.set([cur1, cur2, cur3], { xPercent: 0, yPercent: 0 });
      gsap.set(allLabels, { opacity: 1, y: 0 });

      const enterSlide = Math.max(0.5, cfg.enterDuration - cfg.stagger * 2);
      const tl = gsap.timeline({ onComplete: fireComplete });
      animations.push(tl);

      // Peel off in reverse: cur3 (top of stack) lifts first.
      tl.to(cur3, { yPercent: -101, duration: enterSlide, ease }, 0);
      tl.to(labelsOf(cur3), { opacity: 0, duration: 0.2 }, 0);

      tl.to(cur2, { xPercent: -101, duration: enterSlide, ease }, cfg.stagger * 0.6);
      tl.to(labelsOf(cur2), { opacity: 0, duration: 0.2 }, cfg.stagger * 0.6);

      tl.to(cur1, { yPercent: 101, duration: enterSlide, ease }, cfg.stagger * 1.2);
      tl.to(labelsOf(cur1), { opacity: 0, duration: 0.2 }, cfg.stagger * 1.2);
    }

    return () => animations.forEach((a) => a.kill());
  }, [phase, reduceMotion]);

  const renderTrack = (
    word: string,
    tone: 'ink' | 'paper',
    scrollClass: string
  ) => {
    const REPEAT = 8;
    return (
      <div
        className={[
          styles.track,
          tone === 'ink' ? styles.inkText : styles.paperText,
          scrollClass,
        ].join(' ')}
      >
        {Array.from({ length: REPEAT }).map((_, i) => (
          <span key={`p-${i}`} className={styles.word}>
            {word}
            <span className={styles.wordItalic}>{word}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {curtains.map((c, i) => {
        const cls = [styles.curtain, [styles.cur1, styles.cur2, styles.cur3][i]].join(' ');
        const labelToneCls = c.labelTone === 'ink' ? styles.labelOnAccent : styles.labelOnInk;
        return (
          <div
            key={i}
            className={cls}
            style={{ background: c.background }}
          >
            {renderTrack(c.textWord, c.textTone, c.scrollClass)}
            {c.labels.tl && (
              <div className={`${styles.label} ${styles.labelTL} ${labelToneCls}`}>
                {c.labels.tl}
              </div>
            )}
            {c.labels.tr && (
              <div className={`${styles.label} ${styles.labelTR} ${labelToneCls}`}>
                {c.labels.tr}
              </div>
            )}
            {c.labels.bl && (
              <div className={`${styles.label} ${styles.labelBL} ${labelToneCls}`}>
                {c.labels.bl}
              </div>
            )}
            {c.labels.br && (
              <div className={`${styles.label} ${styles.labelBR} ${labelToneCls}`}>
                {c.labels.br}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
