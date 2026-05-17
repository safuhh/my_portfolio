'use client';

import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, ANIMATION_CONFIG } from '@/lib/gsap';
import { getAccentColors, transitionsConfig } from '@/data';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { TransitionEffectProps } from '../../types';
import styles from './IrisBloom.module.css';

/**
 * Iris Bloom — concentric color discs bloom outward from the click origin,
 * collapse inward to viewport center to reveal the new page.
 *
 * Adapted from the 04c-iris-bloom prototype with these production changes:
 * - 4 rings (was 5) to fit the ~2.4s budget
 * - useGSAP for automatic cleanup on unmount
 * - Standard easings from ANIMATION_CONFIG (no CustomEase registration)
 * - Reduced-motion crossfade fallback
 * - Origin defaults to viewport center on back-nav (origin === null)
 * - Innermost ring color = destination accent (from payload.accent)
 */

// Outer → inner. Innermost is overridden at runtime with payload.accent.
// Other rings rotate through the palette (skipping the chosen accent for visual contrast).
function buildRingColors(accent: string): string[] {
  const palette = getAccentColors();
  const others = palette.filter((c) => c.toLowerCase() !== accent.toLowerCase());
  // 4 rings, outer-most first
  return [
    '#1b2028', // ink (always outer)
    others[0] ?? palette[1] ?? '#93b99e',
    others[1] ?? palette[2] ?? '#ff990a',
    accent,    // innermost = destination accent
  ];
}

function diagDist(cx: number, cy: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 2.2x oversize so the rings comfortably cover any corner
  return Math.sqrt(
    Math.max(cx, w - cx) ** 2 + Math.max(cy, h - cy) ** 2
  ) * 2.2;
}

export function IrisBloom({ phase, origin, payload, onComplete }: TransitionEffectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const colors = buildRingColors(payload.accent);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const discs = root.querySelectorAll<HTMLDivElement>(`.${styles.disc}`);
      if (discs.length === 0) return;

      // --- Reduced-motion path: simple crossfade panel ---
      if (reduceMotion) {
        if (phase === 'exit') {
          gsap.set(discs, { display: 'none' });
          gsap.fromTo(
            root,
            { opacity: 0 },
            {
              opacity: 1,
              duration: transitionsConfig.reducedMotionDuration,
              ease: 'power2.out',
              onComplete,
            }
          );
        } else {
          gsap.to(root, {
            opacity: 0,
            duration: transitionsConfig.reducedMotionDuration,
            ease: 'power2.in',
            onComplete,
          });
        }
        return;
      }

      // --- Geometry: where to anchor the bloom ---
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = origin?.x ?? w / 2;
      const cy = origin?.y ?? h / 2;
      const D = diagDist(cx, cy);

      // Size each disc to the same diameter D. We scale them in sequence
      // from 0 → 1 for entry, and 1 → 0 for exit.
      const sizeFor = (i: number) => D * (1 - i * 0.04); // tiny shrink per layer for separation

      discs.forEach((d, i) => {
        gsap.set(d, {
          left: `${cx}px`,
          top: `${cy}px`,
          width: `${sizeFor(i)}px`,
          height: `${sizeFor(i)}px`,
          xPercent: -50,
          yPercent: -50,
          background: colors[i],
        });
      });

      const exitEase = ANIMATION_CONFIG.ease.outExpo;     // 'expo.out'
      const enterEase = ANIMATION_CONFIG.ease.inOutQuart; // 'power4.inOut'

      if (phase === 'exit') {
        // Bloom outward — outermost (largest, behind) first, innermost last.
        gsap.set(discs, { scale: 0 });
        gsap.to(discs, {
          scale: 1,
          duration: transitionsConfig.durations.exit,
          ease: exitEase,
          stagger: 0.08,
          onComplete,
        });
      } else {
        // Enter: rings start at scale 1 (covering screen from exit phase),
        // collapse inward to viewport center. Drift center back to viewport
        // mid in case origin was off-center, then collapse innermost → outer
        // so the destination accent is the last to leave.
        const centerSet = { left: `${w / 2}px`, top: `${h / 2}px` };
        gsap.set(discs, { scale: 1, ...centerSet });
        gsap.to([...discs].reverse(), {
          scale: 0,
          duration: transitionsConfig.durations.enter,
          ease: enterEase,
          stagger: 0.08,
          onComplete,
        });
      }
    },
    { scope: rootRef, dependencies: [phase] }
  );

  return (
    <div ref={rootRef} className={styles.root}>
      {/* 4 discs — outermost first */}
      <div className={styles.disc} />
      <div className={styles.disc} />
      <div className={styles.disc} />
      <div className={styles.disc} />
    </div>
  );
}
