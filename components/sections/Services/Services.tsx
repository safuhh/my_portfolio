'use client';

import { useRef, useSyncExternalStore } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, ANIMATION_CONFIG } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useLenis } from '@/lib/LenisProvider';
import { content, getServicesFaces } from '@/data';
import type { ServiceFace } from '@/data';
import styles from './Services.module.css';

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type Direction = (typeof DIRECTIONS)[number];

const randDir = (): Direction => DIRECTIONS[Math.floor(Math.random() * 4)];

const dirTransform = (dir: Direction, dist = 110) => {
  switch (dir) {
    case 'up':    return { x: 0,     y: -dist };
    case 'down':  return { x: 0,     y:  dist };
    case 'left':  return { x: -dist, y: 0 };
    case 'right': return { x:  dist, y: 0 };
  }
};

const opposite = (d: Direction): Direction =>
  ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[d];

/* SVG path for the four-pointed star glyph used in both the meta-label and the
   tool separators. Single source so design tweaks land in one place. */
const STAR_PATH =
  'M12 0C12 0 14.5 9.5 24 12C14.5 14.5 12 24 12 24C12 24 9.5 14.5 0 12C9.5 9.5 12 0 12 0Z';

const Star = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d={STAR_PATH}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* Inline-HTML string form of the star, used by the tools-row separators which
   are built imperatively (paintTools mutates DOM directly so GSAP can target
   the .glyph spans without React diffing fighting it). */
const STAR_SVG =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">' +
  `<path d="${STAR_PATH}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>`;

const TOOL_DIST_PCT = '120%';
const TOOL_DIST_PCT_NEG = '-120%';
const FACES: ReadonlyArray<ServiceFace> = getServicesFaces();
const TOTAL_LABEL = String(FACES.length).padStart(2, '0');

/* Touch gesture threshold — minimum vertical travel before we count a
   touchmove as a face-advancing swipe. */
const TOUCH_THRESHOLD_PX = 40;

/* Gesture-coalescing inactivity gap. A continuous wheel burst (trackpad
   momentum, sustained scroll) keeps emitting events ~8–30 ms apart, so any
   gap under this threshold counts as part of the same physical gesture and
   gets absorbed. The next wheel event with a gap larger than this is the
   start of a new gesture. The `swapping` gate still prevents face skipping
   if a trackpad stutter splits one physical flick into two gestures. */
const GESTURE_GAP_MS = 70;

/* How long the boundary-release scroll runs before we re-arm the wheel path.
   Matches the duration passed to lenis.scrollTo / window.scrollTo below so we
   don't re-fire a fresh scroll mid-animation under a sustained burst. */
const BOUNDARY_RELEASE_MS = 400;

/* Stable IDs for the section landmark and the current-face description. Only
   one Services exists on the page, so a hand-rolled namespace is simpler than
   useId() (which has known hydration-mismatch failure modes under hot reload
   when paired with useSyncExternalStore-based hooks above it in the tree). */
const HEADING_ID = 'services-heading';
const CURRENT_FACE_ID = 'services-current-face';

/* Subscribe to `(pointer: coarse)` and small-screen media queries so a user
   rotating a tablet, resizing the window, or dragging across devices in dev-
   tools picks up the right mode without a full reload. Mirrors useReducedMotion. */
const STATIC_QUERY = '(pointer: coarse), (max-width: 767px)';

function subscribeStatic(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(STATIC_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getStaticSnapshot = () =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia(STATIC_QUERY).matches;

const getStaticServerSnapshot = () => false;

function useStaticFallback(): boolean {
  return useSyncExternalStore(subscribeStatic, getStaticSnapshot, getStaticServerSnapshot);
}

export function Services() {
  const reducedMotion = useReducedMotion();
  const isCoarseOrSmall = useStaticFallback();
  const useStaticLayout = reducedMotion || isCoarseOrSmall;

  if (useStaticLayout) {
    return <StaticServices />;
  }

  return <DrumServices />;
}

/* ──────────────────────────────────────────────────────────────────────────
   Static fallback — rendered when prefers-reduced-motion is set OR the user
   is on a coarse-pointer / small-screen device. All four faces are visible
   in flow; no scroll hijack, no GSAP. Mirrors the InteractiveBackground
   architectural convention of stripping interactive flourishes when input
   modality or motion preference can't support them.
   ────────────────────────────────────────────────────────────────────────── */
function StaticServices() {
  return (
    <section
      className={styles.wrapper}
      aria-labelledby={HEADING_ID}
    >
      <div className={styles.metaLabel}>
        <Star className={styles.starIcon} />
        {content.services.label}
      </div>

      <header className={styles.head}>
        <h2 id={HEADING_ID}>
          {content.services.headline.lead}
          <br />
          <em>{content.services.headline.accent}</em>
        </h2>
        <p dangerouslySetInnerHTML={{ __html: content.services.intro }} />
      </header>

      <ol className={styles.stack}>
        {FACES.map((face, i) => (
          <li key={face.word} className={styles.stackCard}>
            <div className={styles.stackHead}>
              <strong>{face.rail}</strong>
              <span>{String(i + 1).padStart(2, '0')} / {TOTAL_LABEL}</span>
            </div>
            <span className={styles.stackWord}>
              {[...face.word].map((ch, j) =>
                ch === '.' ? (
                  <span key={j} className={styles.accent}>{ch}</span>
                ) : (
                  <span key={j}>{ch}</span>
                ),
              )}
            </span>
            <p
              className={styles.stackCopy}
              dangerouslySetInnerHTML={{ __html: face.copy }}
            />
            <div className={styles.stackTools}>
              {face.tools.map((tool) => (
                <span key={tool} className={styles.stackTool}>{tool}</span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Drum — pinned scroll-hijacked face-cycling experience for pointer + motion
   capable visitors. State machine documented inline below.
   ────────────────────────────────────────────────────────────────────────── */
function DrumServices() {
  const wrapperRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const bigwordRef = useRef<HTMLHeadingElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const nowNameRef = useRef<HTMLSpanElement>(null);
  const nowIdxRef = useRef<HTMLSpanElement>(null);
  const descLabelRef = useRef<HTMLSpanElement>(null);
  const descCopyRef = useRef<HTMLParagraphElement>(null);
  const ariaLiveRef = useRef<HTMLDivElement>(null);
  const tickRefs = useRef<Array<HTMLSpanElement | null>>(Array(FACES.length).fill(null));

  const lenis = useLenis();

  useGSAP(() => {
    const bigword = bigwordRef.current;
    const toolsEl = toolsRef.current;
    const pinEl = pinRef.current;
    const shellEl = shellRef.current;
    if (!bigword || !toolsEl || !pinEl || !shellEl) return;

    // ---- imperative paint ----
    function paintBigWord(word: string) {
      bigword!.innerHTML = '';
      for (const ch of word) {
        const mask = document.createElement('span');
        mask.className = styles.portalMask;
        const inner = document.createElement('span');
        inner.className = styles.portalLetter;
        if (ch === '.') inner.classList.add(styles.accent);
        inner.textContent = ch;
        mask.appendChild(inner);
        bigword!.appendChild(mask);
      }
    }

    function paintTools(tools: readonly string[]) {
      toolsEl!.innerHTML = '';
      tools.forEach((t, i) => {
        const mask = document.createElement('span');
        mask.className = styles.tool;
        const glyph = document.createElement('span');
        glyph.className = styles.glyph;
        glyph.textContent = t;
        mask.appendChild(glyph);
        toolsEl!.appendChild(mask);
        if (i < tools.length - 1) {
          const sep = document.createElement('span');
          sep.className = styles.ttsep;
          sep.innerHTML = STAR_SVG;
          toolsEl!.appendChild(sep);
        }
      });
    }

    const getLetters = () =>
      Array.from(bigword.querySelectorAll<HTMLElement>(`.${styles.portalLetter}`));
    const getGlyphs = () =>
      Array.from(toolsEl.querySelectorAll<HTMLElement>(`.${styles.glyph}`));

    // ---- motion primitives (portal letters) ----
    function parkOffStage(elements: HTMLElement[]) {
      elements.forEach((el) => {
        const inv = dirTransform(opposite(randDir()), 110);
        gsap.set(el, { x: inv.x + '%', y: inv.y + '%' });
      });
    }

    function portalOut(elements: HTMLElement[]): Promise<void> {
      return new Promise((resolve) => {
        if (!elements.length) { resolve(); return; }
        const tl = gsap.timeline({
          onComplete: resolve,
          defaults: { duration: 0.25, ease: ANIMATION_CONFIG.ease.inQuad },
        });
        elements.forEach((el, i) => {
          const t = dirTransform(randDir(), 110);
          tl.to(el, { x: t.x + '%', y: t.y + '%' }, i * 0.018);
        });
      });
    }

    function portalIn(elements: HTMLElement[]) {
      elements.forEach((el, i) => {
        const inv = dirTransform(opposite(randDir()), 110);
        gsap.set(el, { x: inv.x + '%', y: inv.y + '%' });
        gsap.to(el, {
          x: '0%', y: '0%',
          duration: 0.5,
          delay: i * 0.08,
          ease: ANIMATION_CONFIG.ease.outQuad,
        });
      });
    }

    // ---- motion primitives (tools — vertical only) ----
    function parkToolsOffStage(elements: HTMLElement[]) {
      elements.forEach((el) => {
        gsap.set(el, { x: 0, y: TOOL_DIST_PCT, opacity: 0 });
      });
    }

    function toolsIn(elements: HTMLElement[], baseDelay = 0) {
      elements.forEach((el, i) => {
        gsap.set(el, { x: 0, y: TOOL_DIST_PCT, opacity: 0 });
        gsap.to(el, {
          y: '0%',
          opacity: 1,
          duration: 0.6,
          delay: baseDelay + i * 0.035,
          ease: ANIMATION_CONFIG.ease.outCubic,
        });
      });
    }

    function toolsOut(elements: HTMLElement[]): Promise<void> {
      return new Promise((resolve) => {
        if (!elements.length) { resolve(); return; }
        const tl = gsap.timeline({
          onComplete: resolve,
          defaults: { duration: 0.32, ease: ANIMATION_CONFIG.ease.inQuad },
        });
        elements.forEach((el, i) => {
          tl.to(el, { y: TOOL_DIST_PCT_NEG, opacity: 0 }, i * 0.022);
        });
      });
    }

    // ---- label / counter / tick updates ----
    function paintLabels(i: number) {
      const face = FACES[i];
      if (nowNameRef.current) nowNameRef.current.textContent = face.rail;
      if (nowIdxRef.current)
        nowIdxRef.current.textContent = String(i + 1).padStart(2, '0') + ' / ' + TOTAL_LABEL;
      if (descLabelRef.current) descLabelRef.current.textContent = face.label;
      if (descCopyRef.current) descCopyRef.current.innerHTML = face.copy;
      if (ariaLiveRef.current)
        ariaLiveRef.current.textContent =
          `Showing face ${i + 1} of ${FACES.length}: ${face.rail}. ${face.label}.`;
      tickRefs.current.forEach((t, j) => {
        if (t) t.style.setProperty('--p', j <= i ? '100%' : '0%');
      });
    }

    // ---- state machine (closure-local) ----
    /* targetIdx — what we're animating TOWARD. Updates synchronously when
       swapTo is called. The wheel/touch/key handlers and the boundary check
       both read this, so once we've committed to face N (started its swap)
       the next gesture plans its move from N rather than from the still-
       visible-during-tween predecessor. This is the BL-03 fix: the original
       code mutated a single `cur` counter pre-animation, which let a mid-
       swap reversal trip the boundary check (cur + dir hit FACES.length
       prematurely when the user was reversing AWAY from the boundary). */
    let targetIdx = 0;
    let entered = false;
    let swapping = false;
    let pendingTarget: number | null = null;
    /* Pin engagement flag — toggled by PIN trigger callbacks. Gesture hijack
       below is only armed while this is true, so the drum doesn't intercept
       wheel events when it isn't on screen. */
    let active = false;
    /* Inactivity-driven gesture-coalescing flag. Flips true at the first
       wheel of a new gesture; flips false only when the NEXT wheel event
       arrives with sinceLast > GESTURE_GAP_MS. No timers — driven entirely
       by incoming events, so it can't get stuck on during sustained input
       the way the earlier setTimeout-based attempt did. */
    let gestureActive = false;
    let lastWheelTime = 0;
    /* Direction of the in-flight swap, used to allow opposite-direction
       gestures to queue (back-and-forth feels responsive) while keeping
       same-direction gestures blocked (no face skipping under a burst).
       Reset to 0 when the swap completes so stale direction state can't
       leak into future gates. */
    let currentSwapDir: 0 | 1 | -1 = 0;
    /* Boundary-release guard. While a lenis.scrollTo / window.scrollTo handoff
       is in flight, additional wheels at the boundary are absorbed instead of
       re-firing fresh scroll commands (which would jolt Lenis mid-flight). */
    let releasing = false;

    // ---- initial paint + park ----
    paintBigWord(FACES[0].word);
    paintTools(FACES[0].tools);
    paintLabels(0);
    parkOffStage(getLetters());
    parkToolsOffStage(getGlyphs());

    function enterFace(i: number) {
      paintBigWord(FACES[i].word);
      paintTools(FACES[i].tools);
      const inLetters = getLetters();
      const inTools = getGlyphs();
      parkToolsOffStage(inTools);
      gsap.killTweensOf([...inLetters, ...inTools]);
      portalIn(inLetters);
      toolsIn(inTools, 0.12);
    }

    function collapseTo(i: number) {
      targetIdx = i;
      gsap.killTweensOf([...getLetters(), ...getGlyphs()]);
      paintLabels(i);
      enterFace(i);
    }

    async function swapTo(i: number) {
      if (i === targetIdx) return;
      if (swapping) {
        pendingTarget = i;
        return;
      }
      swapping = true;
      targetIdx = i;
      pendingTarget = null;

      paintLabels(i);
      const outLetters = getLetters();
      const outTools = getGlyphs();
      gsap.killTweensOf([...outLetters, ...outTools]);

      await Promise.all([portalOut(outLetters), toolsOut(outTools)]);

      enterFace(i);
      swapping = false;
      currentSwapDir = 0;

      if (pendingTarget !== null && pendingTarget !== targetIdx) {
        const next = pendingTarget;
        pendingTarget = null;
        collapseTo(next);
      }
    }

    // ---- ScrollTriggers ----
    const entryTrigger = ScrollTrigger.create({
      trigger: shellEl,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        entered = true;
        portalIn(getLetters());
        toolsIn(getGlyphs(), 0.12);
      },
    });

    /* PIN — holds the drum at viewport top across the 4-face traversal.
       onEnter/onEnterBack arm the gesture hijack; the leave callbacks disarm
       it so wheel events outside the drum's lifetime go back to Lenis. */
    const pinTrigger = ScrollTrigger.create({
      trigger: shellEl,
      start: 'top top',
      end: () => `+=${window.innerHeight * FACES.length}`,
      pin: pinEl,
      pinSpacing: true,
      pinType: 'fixed',
      onEnter: () => { active = true; },
      onEnterBack: () => { active = true; },
      onLeave: () => {
        active = false;
        gestureActive = false;
        currentSwapDir = 0;
        releasing = false;
      },
      onLeaveBack: () => {
        active = false;
        gestureActive = false;
        currentSwapDir = 0;
        releasing = false;
      },
    });

    /* Gesture hijack. We replaced ScrollTrigger.snap (which never fired
       cleanly under Lenis smoothing) with direct wheel/touch/key
       interception. Each gesture either advances exactly one face or, at
       the boundary, hands scroll back to Lenis so the user can exit. */

    /* Detect whether `lenis` from useLenis is the default no-op (consumed
       outside LenisProvider, or before the provider mounted) by comparing
       the actual scrollTo reference's behavior. The provider wraps scrollTo
       in useCallback with a ref-deref, so it's always callable but may be a
       silent no-op. We fall back to native smooth scroll for the handoff so
       the user is never stranded at the pin end. */
    const releasePastBoundary = (direction: 1 | -1) => {
      if (releasing) return;
      releasing = true;
      const target = direction > 0 ? pinTrigger.end + 1 : pinTrigger.start - 1;
      try {
        lenis.scrollTo(target, { duration: BOUNDARY_RELEASE_MS / 1000 });
      } catch {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
      /* No onComplete on lenis.scrollTo's public type, so we time-out the
         flag instead. Slightly longer than the configured duration to absorb
         any late-arriving wheels from the inertial tail of the gesture. */
      window.setTimeout(() => { releasing = false; }, BOUNDARY_RELEASE_MS + 100);
    };

    /* Shared advance: takes a direction and either queues a swap or hands
       off past the boundary. Returns true if the input was consumed. */
    const advance = (dir: 1 | -1): boolean => {
      if (swapping && dir === currentSwapDir) return true;
      const next = targetIdx + dir;
      if (next < 0 || next >= FACES.length) {
        releasePastBoundary(dir);
        return true;
      }
      currentSwapDir = dir;
      swapTo(next);
      return true;
    };

    /* Wheel hijack. `stopImmediatePropagation` is required, not preferred:
       Lenis attaches its wheel listener at window-bubble, and for events
       dispatched on window the dispatch target IS window, so all listeners
       on window run in the AT_TARGET phase regardless of their capture flag.
       `stopPropagation` only stops capture/bubble traversal — it does NOT
       stop sibling listeners on the same target. `stopImmediatePropagation`
       does. Without it, Lenis sees every wheel and the scrollY drifts under
       the pin. Any future window-level wheel listener that needs to coexist
       with this section must attach BEFORE we mount (so it runs before our
       capture-phase listener) or use a different target. */
    const wheelOpts = { capture: true, passive: false } as const;
    const onWheel = (e: WheelEvent) => {
      if (!entered || !active) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      if (releasing) return;

      const now = performance.now();
      const sinceLast = now - lastWheelTime;
      lastWheelTime = now;

      /* Inactivity → previous gesture is over. The wheel we're processing is
         the first event of a new gesture. */
      if (sinceLast > GESTURE_GAP_MS) gestureActive = false;

      /* Same-physical-gesture absorb — applies regardless of direction. */
      if (gestureActive) return;

      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      gestureActive = true;
      advance(dir);
    };

    /* Touch path mirrors wheel: own input while engaged, fire at most one
       swap per touch session, and let opposite-direction reversals queue
       via swapTo/pendingTarget. Multi-touch is rejected outright so a
       pinch gesture doesn't race against e.touches[0]. */
    let touchStartY: number | null = null;
    let touchGestureFired = false;
    const onTouchStart = (e: TouchEvent) => {
      if (!entered || !active) return;
      if (e.touches.length !== 1) {
        touchStartY = null;
        touchGestureFired = false;
        return;
      }
      touchStartY = e.touches[0].clientY;
      touchGestureFired = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!entered || !active || touchStartY === null) return;
      if (e.touches.length !== 1) return;
      if (touchGestureFired) {
        /* Keep absorbing the rest of this gesture so the page underneath
           doesn't scroll once we've committed to a face swap. */
        e.preventDefault();
        return;
      }
      const dy = touchStartY - e.touches[0].clientY;
      const ady = Math.abs(dy);
      if (ady < TOUCH_THRESHOLD_PX) {
        /* Below the intent threshold — let small finger jitter through as a
           native event so the user isn't locked in place. */
        return;
      }
      e.preventDefault();
      touchGestureFired = true;
      const dir: 1 | -1 = dy > 0 ? 1 : -1;
      advance(dir);
    };
    const onTouchEnd = () => {
      touchStartY = null;
      touchGestureFired = false;
    };

    /* Keyboard a11y — WCAG 2.1.1. Without this, keyboard users scroll
       through the pin without ever advancing the drum, because GSAP
       ScrollTrigger pins the element via position:fixed but doesn't bind
       any keyboard navigation. */
    const onKey = (e: KeyboardEvent) => {
      if (!entered || !active) return;
      let dir: 1 | -1 | 0 = 0;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Spacebar':
          dir = 1;
          break;
        case 'ArrowUp':
        case 'PageUp':
          dir = -1;
          break;
        case 'Home':
          e.preventDefault();
          collapseTo(0);
          return;
        case 'End':
          e.preventDefault();
          collapseTo(FACES.length - 1);
          return;
        default:
          return;
      }
      e.preventDefault();
      if (releasing) return;
      /* Don't gestureActive-gate keyboard: each keypress is a discrete intent.
         The swapping/direction gate still applies via advance(). */
      advance(dir);
    };

    window.addEventListener('wheel', onWheel, wheelOpts);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey, { capture: true });

    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey, { capture: true });
      entryTrigger.kill();
      pinTrigger.kill();
    };
  }, { scope: wrapperRef });

  return (
    <section
      ref={wrapperRef}
      className={styles.wrapper}
      aria-labelledby={HEADING_ID}
    >
      <div className={styles.metaLabel}>
        <Star className={styles.starIcon} />
        {content.services.label}
      </div>

      <header className={styles.head}>
        <h2 id={HEADING_ID}>
          {content.services.headline.lead}
          <br />
          <em>{content.services.headline.accent}</em>
        </h2>
        <p dangerouslySetInnerHTML={{ __html: content.services.intro }} />
      </header>

      <div ref={shellRef} className={styles.shell}>
        <div ref={pinRef} className={styles.pin}>
          <div className={styles.bay}>
            <h3 ref={bigwordRef} className={styles.bigword} />
          </div>

          <div className={styles.rail}>
            <span className={styles.now}>
              <span className={styles.dot} />
              <span ref={nowNameRef}>{FACES[0].rail}</span>
            </span>
            <span className={styles.ticks}>
              {FACES.map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    tickRefs.current[i] = el;
                  }}
                  className={styles.tick}
                />
              ))}
            </span>
            <span ref={nowIdxRef}>{'01 / ' + TOTAL_LABEL}</span>
          </div>

          <div ref={toolsRef} className={styles.tools} />
        </div>
      </div>

      <section
        className={styles.descript}
        aria-labelledby={CURRENT_FACE_ID}
      >
        <span
          id={CURRENT_FACE_ID}
          ref={descLabelRef}
          className={styles.which}
        >
          {FACES[0].label}
        </span>
        <p
          ref={descCopyRef}
          className={styles.copy}
          dangerouslySetInnerHTML={{ __html: FACES[0].copy }}
        />
      </section>

      <div
        ref={ariaLiveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {`Showing face 1 of ${FACES.length}: ${FACES[0].rail}. ${FACES[0].label}.`}
      </div>
    </section>
  );
}
