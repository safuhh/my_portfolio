'use client';

import { useRef, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { content } from '@/data';
import { Star } from '../Services/Star';
import {
  GAP_PX,
  HEADING_ID,
  PIN_RUNWAY_VH,
  PIN_SCRUB,
  ZONES,
  formatZoneIndex,
  zoneRail,
} from './constants';
import {
  buildCells,
  countRealCells,
  indexAtNeedle,
  isZoneBoundary,
  tunedAt,
} from './dialBuild';
import {
  computeSwapTiming,
  ledeRevealIn,
  ledeRevealOut,
  portalBigWordIn,
  portalBigWordOut,
  splitBigWord,
  splitLede,
} from './dialMotion';
import styles from './ServicesV2.module.css';

/* Inline-style width for the zone indicator. Computed from ZONES.length so
   the indicator always spans exactly one zone cell, regardless of how many
   zones the content file declares. translateX(zoneIdx * 100%) then slides
   it cell-by-cell across the row. */
const ZONE_INDICATOR_WIDTH = `${100 / Math.max(1, ZONES.length)}%`;

/* Pinned, scrub-driven tuning-dial implementation of the Services section.
   Scroll progress (0..1) → strip translateX + needle highlight + zone change.

   Architectural deltas vs. Services V1 (DrumServices):
     - No wheel/touch hijack. Native scroll drives a ScrollTrigger.scrub,
       and the dial pans continuously rather than snapping per gesture.
     - No `boundary release` machinery — the scrub naturally hands off to
       the next pinned section once it reaches `progress = 1`.
     - The bigword + lede swap only fires on zone boundary crossings, not
       per scroll tick. We compare `bigword.dataset.zone` against the
       newly-tuned cell's zone before triggering the portal/mask animation. */
export function DialServicesV2() {
  const wrapperRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const dialwrapRef = useRef<HTMLDivElement>(null);
  const dialStripRef = useRef<HTMLDivElement>(null);
  const notchesRef = useRef<HTMLDivElement>(null);
  const bigwordRef = useRef<HTMLHeadingElement>(null);
  const ledeRef = useRef<HTMLParagraphElement>(null);
  const zoneIndicatorRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef<Array<HTMLDivElement | null>>(Array(ZONES.length).fill(null));
  const liveRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const shellEl = shellRef.current;
      const pinEl = pinRef.current;
      const dialwrapEl = dialwrapRef.current;
      const dialStripEl = dialStripRef.current;
      const notchesEl = notchesRef.current;
      const bigwordEl = bigwordRef.current;
      const ledeEl = ledeRef.current;
      const indicatorEl = zoneIndicatorRef.current;
      if (
        !shellEl ||
        !pinEl ||
        !dialwrapEl ||
        !dialStripEl ||
        !notchesEl ||
        !bigwordEl ||
        !ledeEl ||
        !indicatorEl
      ) {
        return;
      }

      const splitCls = {
        letterMask: styles.letterMask,
        letterInner: styles.letterInner,
        accent: styles.accent,
      };
      const ledeCls = {
        ledeWord: styles.ledeWord,
        ledeWordInner: styles.ledeWordInner,
        ledeBold: styles.ledeBold,
      };

      const cells = buildCells(ZONES);
      /* Snapshot once — `realCount` is data-derived and immutable for the
         lifetime of the section, so re-scanning per scroll tick is waste. */
      const realCount = countRealCells(cells);

      /* Build the dial strip and notches imperatively. Mutating the DOM
         once on mount (rather than rendering ~30+ React children that
         each need a stable ref for color/transform updates per scroll
         frame) keeps the per-frame work to direct style writes. */
      const toolEls: Array<HTMLSpanElement | null> = [];
      cells.forEach((cell, i) => {
        const cellEl = document.createElement('div');
        cellEl.className = styles.dialCell;
        if (!cell.isPad) {
          const tool = document.createElement('span');
          tool.className = styles.dialTool;
          tool.textContent = cell.name;
          cellEl.appendChild(tool);
          toolEls.push(tool);
        } else {
          toolEls.push(null);
        }
        dialStripEl.appendChild(cellEl);

        const notchEl = document.createElement('div');
        notchEl.className = styles.notch;
        if (isZoneBoundary(cells, i)) {
          notchEl.classList.add(styles.notchMajor);
        }
        notchesEl.appendChild(notchEl);
      });

      /* Cache the dialwrap centre offset so the per-frame hot path can avoid
         getBoundingClientRect (which forces synchronous layout). Recomputed
         only when the wrap actually resizes — observed via ResizeObserver,
         not polled. */
      let centerOffset = dialwrapEl.getBoundingClientRect().width / 2;
      const wrapObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        centerOffset = entry.contentRect.width / 2;
      });
      wrapObserver.observe(dialwrapEl);

      /* All in-flight gsap.delayedCall and tween handles created inside
         transitionZone. Tracking them lets the unmount cleanup kill any
         work that's queued past the natural end of the section's lifetime —
         without this, a route change mid-swap would mutate detached DOM
         and leak the closure that owns these refs. */
      const pendingDelays = new Set<gsap.core.Tween>();
      const trackDelay = (delay: gsap.core.Tween): gsap.core.Tween => {
        pendingDelays.add(delay);
        return delay;
      };

      /* Coalesce overlapping zone transitions. If a new zone boundary is
         crossed mid-OUT, latch the target and process when the current IN
         finishes — same shape as DrumServices' `swapping/pendingTarget`. */
      let zoneAnimating = false;
      let pendingZoneIdx: number | null = null;
      /* Closure-scoped target marker for the gate in applyDial. Previously
         lived on bigwordEl.dataset.zone, which made the gate read like
         "currently displayed zone" while actually meaning "latest target
         we've called transitionZone for" — a semantic mismatch that
         confused review. dataset.zone is now written only when the new
         content is actually swapped in (inside swapDelay), so external
         readers (a11y tools, tests, devtools) see the honest current
         state; the gate state lives here. */
      let lastTargetZoneIdx = 0;

      /* aria-live debounce. Each scroll tick that crosses a zone boundary
         calls paintZoneAffordances which would otherwise mutate the live
         region; AT engines queue every change, so a fast scroll past three
         zones can produce three queued announcements. Coalesce to the
         latest target after a short quiet period so the announcement
         matches what the user actually parks on. */
      let liveTimeoutId: number | null = null;
      const ANNOUNCE_DEBOUNCE_MS = 350;
      const announceZone = (zoneIdx: number) => {
        if (liveTimeoutId !== null) window.clearTimeout(liveTimeoutId);
        liveTimeoutId = window.setTimeout(() => {
          liveTimeoutId = null;
          if (!liveRef.current) return;
          const zone = ZONES[zoneIdx];
          liveRef.current.textContent = `Showing zone ${zoneIdx + 1} of ${ZONES.length}: ${zoneRail(zone)}.`;
        }, ANNOUNCE_DEBOUNCE_MS);
      };

      const paintZoneAffordances = (zoneIdx: number) => {
        const refs = zoneRefs.current;
        for (let j = 0; j < refs.length; j++) {
          const el = refs[j];
          if (!el) continue;
          el.classList.toggle(styles.zoneActive, j === zoneIdx);
        }
        indicatorEl.style.transform = `translateX(${zoneIdx * 100}%)`;
        announceZone(zoneIdx);
      };

      const transitionZone = (zoneIdx: number) => {
        /* Paint affordances FIRST — before the animating gate. Even when a
           transition is coalesced (animation is in flight, we just latch
           the new target), we still want the indicator to slide, the active
           zone class to flip, and the live region to announce the zone the
           user is now parked on. Otherwise fast scrolls past intermediate
           zones produce a silent jump from N to N+2 in the AT timeline. */
        paintZoneAffordances(zoneIdx);

        if (zoneAnimating) {
          pendingZoneIdx = zoneIdx;
          return;
        }
        zoneAnimating = true;
        const zone = ZONES[zoneIdx];

        const bwOutEnd = portalBigWordOut(
          [...bigwordEl.querySelectorAll<HTMLSpanElement>(`.${styles.letterInner}`)],
        );
        const ledeOutEnd = ledeRevealOut(ledeEl, styles.ledeWordInner);
        const { swapAt } = computeSwapTiming(bwOutEnd, ledeOutEnd);

        const swapDelay = trackDelay(
          gsap.delayedCall(swapAt, () => {
            pendingDelays.delete(swapDelay);

            /* Snapshot the nodes that are about to be detached and kill any
               OUT/IN tweens still pointing at them. The earlier OUT tweens
               were scheduled in transitionZone above; if their finish ticks
               land after `swapAt` (because GSAP's tick is decoupled from
               our delayedCall), they'd keep writing yPercent/x/y to nodes
               we're about to drop on the floor — wasted work, and a leak
               of tween handles past their visual lifetime. */
            const prevLetters = [
              ...bigwordEl.querySelectorAll<HTMLSpanElement>(`.${styles.letterInner}`),
            ];
            const prevLedeInners = [
              ...ledeEl.querySelectorAll<HTMLSpanElement>(`.${styles.ledeWordInner}`),
            ];
            if (prevLetters.length || prevLedeInners.length) {
              gsap.killTweensOf([...prevLetters, ...prevLedeInners]);
            }

            const newLetters = splitBigWord(zone.word, bigwordEl, splitCls);
            /* Mark dataset.zone as the *displayed* zone right when the new
               content is in the DOM, not at applyDial-call-time. Honest
               state for AT/devtools/tests reading this attribute. */
            bigwordEl.dataset.zone = String(zoneIdx);
            const bwInEnd = portalBigWordIn(newLetters);

            splitLede(zone.copy, ledeEl, ledeCls);
            const ledeInEnd = ledeRevealIn(ledeEl, styles.ledeWordInner);

            const endDelay = trackDelay(
              gsap.delayedCall(Math.max(bwInEnd, ledeInEnd), () => {
                pendingDelays.delete(endDelay);
                zoneAnimating = false;
                const next = pendingZoneIdx;
                pendingZoneIdx = null;
                if (next !== null && next !== zoneIdx) transitionZone(next);
              }),
            );
          }),
        );
      };

      /* Single scroll-driven function. Per-frame work:
           - 1 transform write (strip + notches share the same x via gsap.set)
           - N opacity + N transform writes (N ≈ realCount, all composited)
           - 0 layout reads — `centerOffset` is cached via ResizeObserver
         The bigword/lede portal swap is gated by `dataset.zone` so it only
         fires when the nearest cell crosses a zone boundary. */
      const applyDial = (progress: number) => {
        const idxFloat = indexAtNeedle(progress, realCount);
        const x = centerOffset - (idxFloat + 0.5) * GAP_PX;
        gsap.set([dialStripEl, notchesEl], { x });

        for (let i = 0; i < cells.length; i++) {
          const el = toolEls[i];
          if (!el) continue;
          const dist = Math.abs(i - idxFloat);
          const t = Math.max(0, 1 - dist / 2.4);
          /* Opacity-only, not color: the dial-tool base color is set via
             CSS var (light + dark themes resolve independently). Writing
             `rgba(27,32,40,...)` here would lock the tool to the light
             palette and disappear under dark mode. */
          el.style.opacity = String(0.3 + t * 0.7);
          el.style.transform = `translateY(${(1 - t) * -2}px) scale(${1 + t * 0.18})`;
        }

        const nearest = tunedAt(idxFloat, cells);
        if (!nearest) return;
        if (nearest.zoneIdx !== lastTargetZoneIdx) {
          lastTargetZoneIdx = nearest.zoneIdx;
          transitionZone(nearest.zoneIdx);
        }
      };

      /* Initial paint — pre-split bigword + lede so the first frame already
         shows masked content (avoids an unsplit-text flash). */
      const firstZone = ZONES[0];
      bigwordEl.dataset.zone = '0';
      splitBigWord(firstZone.word, bigwordEl, splitCls);
      splitLede(firstZone.copy, ledeEl, ledeCls);
      paintZoneAffordances(0);
      applyDial(0);

      const trigger = ScrollTrigger.create({
        trigger: shellEl,
        start: 'top top',
        end: () => `+=${window.innerHeight * PIN_RUNWAY_VH}`,
        pin: pinEl,
        pinSpacing: true,
        /* Match V1's pinType so two adjacent pinned ScrollTriggers under
           Lenis use the same positioning strategy — avoids inconsistent
           pin-spacer measurement on refresh. */
        pinType: 'fixed',
        scrub: PIN_SCRUB,
        onUpdate: (self) => applyDial(self.progress),
        /* Preserve user scroll position across refresh. Forcing progress
           back to 0 here would yank the dial to zone 0 on every resize,
           font-load, or downstream ScrollTrigger.refresh() — then the
           next onUpdate would race back to the real progress, producing
           a visible double-swap flicker.

           Refresh-time also synchronously re-reads centerOffset: the
           ResizeObserver fires async (microtask after layout) so on a
           refresh triggered by font-load or viewport resize, applyDial
           would otherwise use a stale offset for the strip transform —
           visible as a brief horizontal jump until the next observer
           callback. */
        onRefresh: (self) => {
          centerOffset = dialwrapEl.getBoundingClientRect().width / 2;
          applyDial(self.progress);
        },
      });

      return () => {
        /* Order matters: kill tweens FIRST so any delayedCall about to fire
           doesn't race the DOM teardown below. ScrollTrigger.kill removes
           the trigger + pin-spacer; clearing the imperative children
           guards against React Strict Mode (dev) which runs the effect
           twice — without this, the second run would append a duplicate
           set of cells/notches on top of the first.

           Snapshot the delays via spread before iterating: `delay.kill()`
           does not itself call back into pendingDelays.delete (the swapDelay
           callback that does the delete is what gets cancelled), so direct
           iteration is technically safe today — but the snapshot makes the
           intent unambiguous and survives future refactors where the kill
           handler might add a delete side effect. */
        [...pendingDelays].forEach((d) => d.kill());
        pendingDelays.clear();
        if (liveTimeoutId !== null) {
          window.clearTimeout(liveTimeoutId);
          liveTimeoutId = null;
        }
        gsap.killTweensOf([
          ...bigwordEl.querySelectorAll<HTMLSpanElement>(`.${styles.letterInner}`),
          ...ledeEl.querySelectorAll<HTMLSpanElement>(`.${styles.ledeWordInner}`),
          dialStripEl,
          notchesEl,
        ]);
        wrapObserver.disconnect();
        /* Preserve scroll position across trigger.kill. ScrollTrigger.kill
           removes the pin-spacer; if the page is scrolled past the spacer's
           contribution, the document shortens by ~100vh and the browser
           clamps window.scrollY to the new max, visually jumping the page
           up. Capture-then-restore so a route change / strict-mode re-mount
           feels seamless. */
        const savedScrollY = window.scrollY;
        trigger.kill();
        if (window.scrollY !== savedScrollY) {
          window.scrollTo(0, savedScrollY);
        }
        dialStripEl.replaceChildren();
        notchesEl.replaceChildren();
      };
    },
    { scope: wrapperRef },
  );

  return (
    <section
      ref={wrapperRef}
      className={styles.wrapper}
      aria-labelledby={HEADING_ID}
    >
      <h2 id={HEADING_ID} className={styles.srOnly}>
        {content.services.headline.lead} {content.services.headline.accent}
      </h2>

      <div ref={shellRef} className={styles.shell}>
        <div ref={pinRef} className={styles.pin}>
          <div className={styles.top}>
            <div className={styles.metaLabel}>
              <Star className={styles.starIcon} />
              {content.services.label}
            </div>
            <div className={styles.topRow}>
              {/* bigword + lede content is rendered imperatively on mount
                  (see splitBigWord / splitLede). The empty initial children
                  here just reserve the DOM nodes for the refs. */}
              <h3 ref={bigwordRef} className={styles.word} />
              <p ref={ledeRef} className={styles.lede} />
            </div>
          </div>

          <div ref={dialwrapRef} className={styles.dialwrap}>
            <span className={styles.dialRuleTop} aria-hidden="true" />
            <span className={styles.dialRuleBot} aria-hidden="true" />
            <div ref={dialStripRef} className={styles.dialStrip} />
            <div ref={notchesRef} className={styles.notches} aria-hidden="true" />
            <div className={styles.needle} aria-hidden="true">
              <Star className={`${styles.needleStar} ${styles.needleStarTop}`} />
              <Star className={`${styles.needleStar} ${styles.needleStarBot}`} />
            </div>
          </div>

          <div
            className={styles.zones}
            style={{ '--zone-count': ZONES.length } as CSSProperties}
          >
            <div
              ref={zoneIndicatorRef}
              className={styles.zoneIndicator}
              style={{ width: ZONE_INDICATOR_WIDTH }}
            />
            {ZONES.map((zone, i) => (
              <div
                key={zone.word}
                ref={(el) => {
                  /* React 19 invokes the callback ref with `null` on unmount,
                     and the array was pre-sized to ZONES.length on mount —
                     so writes at index `i` are always in-bounds for the
                     lifetime of this component. The pre-sizing matters: it
                     guarantees `paintZoneAffordances` iterates exactly the
                     declared zone count even if a ref fires out of map order
                     under concurrent rendering. */
                  const refs = zoneRefs.current;
                  if (i < refs.length) refs[i] = el;
                }}
                className={styles.zone}
              >
                <span className={styles.zoneNum}>{formatZoneIndex(i)}</span>
                {zoneRail(zone)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={liveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      />
    </section>
  );
}
