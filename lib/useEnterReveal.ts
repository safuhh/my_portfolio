import { useGSAP } from "@gsap/react";
import { type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type RevealSpec = {
  /** Elements to reveal (resolved within the scope). */
  selector: string;
  /** Resting-state offset to animate *from* (e.g. { opacity: 0, y: 12 } for a
      fade-up, { opacity: 0, scale: 0.8 } for a pop). */
  from: gsap.TweenVars;
  start?: string;
  duration?: number;
  /** Stagger applied across elements that share an entrance (e.g. pills in one
      row). Vertically-stacked elements enter at their own scroll positions and
      already cascade naturally. */
  stagger?: number;
  ease?: string;
};

// Natural resting value for every prop we let callers animate *from*. The
// reveal sets the from-state explicitly, then tweens back to these — an
// explicit fromTo, never gsap.from().
const REST: gsap.TweenVars = {
  opacity: 1,
  autoAlpha: 1,
  scale: 1,
  x: 0,
  y: 0,
  xPercent: 0,
  yPercent: 0,
  rotation: 0,
};

function restFor(from: gsap.TweenVars): gsap.TweenVars {
  const to: gsap.TweenVars = {};
  for (const key of Object.keys(from)) {
    if (key in REST) to[key] = REST[key as keyof gsap.TweenVars];
  }
  return to;
}

// Per-element entrance reveal: each matched element gets its own ScrollTrigger
// and animates from `from` to rest as it scrolls into view, so content far down
// a tall list still animates when reached instead of playing off-screen.
//
// Uses an explicit gsap.set(from) + gsap.to(rest) (a fromTo), NOT gsap.from().
// gsap.from() defaults to immediateRender:true; with several .from() tweens
// sharing targets plus the later ScrollTrigger.refresh() this page needs (the
// pinned hero re-measures everything), GSAP can record the from-value as the
// already-zeroed current value and tween 0 → 0, leaving elements stuck at
// opacity 0. Setting the resting state up front and tweening back is exactly
// what the (reliable) word-line reveal does. ScrollTrigger fires the tween on
// enter — including immediately on refresh for anything already in view — so
// points visible on load still play.
export function useEnterReveal(
  scope: RefObject<HTMLElement | null>,
  specs: RevealSpec[],
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const triggers: ScrollTrigger[] = [];
        const tweens: gsap.core.Tween[] = [];

        specs.forEach(
          ({
            selector,
            from,
            start = "top 90%",
            duration = 0.55,
            stagger = 0.06,
            ease = "power3.out",
          }) => {
            const els = gsap.utils.toArray<HTMLElement>(selector, root);
            if (!els.length) return;

            const to = restFor(from);

            // Hold the resting (hidden) state immediately so nothing flashes
            // before its trigger fires.
            gsap.set(els, from);

            // Group elements by vertical position so a row of pills entering
            // together still staggers, while stacked items keep their own
            // trigger (and natural top-to-bottom cascade).
            const rows = new Map<number, HTMLElement[]>();
            els.forEach((el) => {
              const key = Math.round(el.getBoundingClientRect().top);
              if (!rows.has(key)) rows.set(key, []);
              rows.get(key)!.push(el);
            });

            rows.forEach((group) => {
              const tween = gsap.to(group, {
                ...to,
                duration,
                ease,
                stagger,
                scrollTrigger: { trigger: group[0], start, once: true },
              });
              tweens.push(tween);
              if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
            });
          },
        );

        // Recompute every trigger's start against the final (pinned) layout;
        // anything already past its start plays now, the rest on scroll-in.
        ScrollTrigger.refresh();

        return () => {
          triggers.forEach((t) => t.kill());
          tweens.forEach((t) => t.kill());
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope },
  );
}
