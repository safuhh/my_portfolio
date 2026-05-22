'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useLenis } from '@/lib/LenisProvider';
import { content } from '@/data';
import { Star } from './Star';
import {
  FACES,
  HEADING_ID,
  CURRENT_FACE_ID,
  TOUCH_THRESHOLD_PX,
  GESTURE_GAP_MS,
  BOUNDARY_RELEASE_MS,
  formatFaceIndex,
  formatFaceAnnouncement,
} from './constants';
import { createDrumPainter } from './drumPaint';
import {
  parkOffStage,
  portalOut,
  portalIn,
  toolsFadeIn,
  toolsFadeOut,
} from './drumMotion';
import styles from './Services.module.css';

const WHEEL_OPTS = { capture: true, passive: false } as const;
const KEY_OPTS = { capture: true } as const;

/* Pinned scroll-hijacked face-cycling experience for pointer + motion-capable
   visitors. State machine documented inline. */
export function DrumServices() {
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
    /* `!` non-null assertions paired with the runtime guard below: TS doesn't
       propagate `const` narrowing across nested async / function-declaration
       closures (microsoft/TypeScript#9998), so without the assertions every
       `toolsEl` use inside enterFace/swapTo would re-widen to nullable. */
    const bigword = bigwordRef.current!;
    const toolsEl = toolsRef.current!;
    const pinEl = pinRef.current!;
    const shellEl = shellRef.current!;
    if (!bigword || !toolsEl || !pinEl || !shellEl) return;

    const {
      paintBigWord,
      paintTools,
      measureToolsScrollWidth,
      resetToolsAnimation,
      getLetters,
    } = createDrumPainter({ bigword, toolsEl, styles });

    function paintLabels(i: number) {
      const face = FACES[i];
      if (nowNameRef.current) nowNameRef.current.textContent = face.rail;
      if (nowIdxRef.current) nowIdxRef.current.textContent = formatFaceIndex(i);
      if (descLabelRef.current) descLabelRef.current.textContent = face.label;
      if (descCopyRef.current) descCopyRef.current.innerHTML = face.copy;
      if (ariaLiveRef.current) ariaLiveRef.current.textContent = formatFaceAnnouncement(i);
      tickRefs.current.forEach((t, j) => {
        if (t) t.style.setProperty('--p', j <= i ? '100%' : '0%');
      });
    }

    // ---- state machine (closure-local) ----
    /* targetIdx — what we're animating TOWARD. Updates synchronously when
       swapTo is called so gesture handlers plan from the committed target,
       not the still-visible predecessor. Reading the visible-face index
       would let a mid-swap reversal trip the boundary check (the index
       would advance during the tween and hit FACES.length before the user
       has actually arrived at the last face). */
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
       the way a setTimeout-based approach would. */
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
    measureToolsScrollWidth();
    paintLabels(0);
    parkOffStage(getLetters());
    gsap.set(toolsEl, { opacity: 0 });

    function enterFace(i: number) {
      paintBigWord(FACES[i].word);
      paintTools(FACES[i].tools);
      measureToolsScrollWidth();
      resetToolsAnimation();
      const inLetters = getLetters();
      portalIn(inLetters);
      toolsFadeIn(toolsEl, 0.12);
    }

    function collapseTo(i: number) {
      targetIdx = i;
      gsap.killTweensOf([...getLetters(), toolsEl]);
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
      /* Kill any in-flight tweens so a fast reversal mid-portalOut doesn't
         produce two competing tweens on the same x/y. */
      gsap.killTweensOf([...outLetters, toolsEl]);

      await Promise.all([portalOut(outLetters), toolsFadeOut(toolsEl)]);

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
        toolsFadeIn(toolsEl, 0.12);
      },
    });

    /* PIN — holds the drum at viewport top across the FACES.length-face
       traversal. arm/disarm hook the gesture hijack so wheel events outside
       the drum's lifetime go back to Lenis. */
    const arm = () => { active = true; };
    const disarm = () => {
      active = false;
      gestureActive = false;
      currentSwapDir = 0;
      releasing = false;
    };
    const pinTrigger = ScrollTrigger.create({
      trigger: shellEl,
      start: 'top top',
      end: () => `+=${window.innerHeight * FACES.length}`,
      pin: pinEl,
      pinSpacing: true,
      pinType: 'fixed',
      onEnter: arm,
      onEnterBack: arm,
      onLeave: disarm,
      onLeaveBack: disarm,
    });

    /* Gesture hijack via direct wheel/touch/key interception. ScrollTrigger's
       built-in `snap` doesn't fire cleanly under Lenis smoothing — the snap
       target is moving while Lenis is still settling, and the callback either
       fires late or not at all. Each gesture here either advances exactly one
       face or, at the boundary, hands scroll back to Lenis. */

    /* Lenis is wrapped in a default no-op provider when consumed outside
       LenisProvider; we wrap in try/catch as a belt-and-suspenders fallback
       in case a future Lenis upgrade throws on bad input. */
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

    /* Takes a direction and either queues a swap or hands off past the
       boundary. */
    const advance = (dir: 1 | -1) => {
      if (swapping && dir === currentSwapDir) return;
      const next = targetIdx + dir;
      if (next < 0 || next >= FACES.length) {
        releasePastBoundary(dir);
        return;
      }
      currentSwapDir = dir;
      swapTo(next);
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
    const onWheel = (e: WheelEvent) => {
      if (!entered || !active) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      if (releasing) return;

      /* event.timeStamp is a DOMHighResTimeStamp populated at dispatch time;
         it's strictly more accurate than performance.now() at handler-run
         time and free to read. */
      const now = e.timeStamp;
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

    window.addEventListener('wheel', onWheel, WHEEL_OPTS);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey, KEY_OPTS);

    /* ResizeObserver on the tools track itself — fires only when the track's
       box actually changes (e.g. font/gap clamp resolving differently after a
       width change). Coalesced through a single rAF so a drag-resize doesn't
       run measure on every intermediate width. */
    let resizeFrame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => measureToolsScrollWidth());
    });
    ro.observe(toolsEl);

    return () => {
      window.removeEventListener('wheel', onWheel, WHEEL_OPTS);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey, KEY_OPTS);
      cancelAnimationFrame(resizeFrame);
      ro.disconnect();
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
      <h2 id={HEADING_ID} className={styles.srOnly}>
        {content.services.headline.lead} {content.services.headline.accent}
      </h2>

      <div ref={shellRef} className={styles.shell}>
        <div ref={pinRef} className={styles.pin}>
          <div className={styles.metaLabel}>
            <Star className={styles.starIcon} />
            {content.services.label}
          </div>

          <div className={styles.bay}>
            <h3 ref={bigwordRef} className={styles.bigword} />
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
            <span ref={nowIdxRef}>{formatFaceIndex(0)}</span>
          </div>

          <div className={styles.tools} aria-hidden="true">
            <div ref={toolsRef} className={styles.toolsTrack} />
          </div>
        </div>
      </div>

      <div
        ref={ariaLiveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {formatFaceAnnouncement(0)}
      </div>
    </section>
  );
}
