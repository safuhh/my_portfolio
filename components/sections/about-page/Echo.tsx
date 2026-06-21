"use client";

/* ABOUT PAGE · Hero variant — "Echo".
   A stacked typographic masthead from Figma (node 53:31): one solid "ABOUT ME"
   set colossal in the centre — ABOUT in muted ink, ME in the live accent — with
   three outlined echo rows mirrored above and below. Each echo is the same word
   clipped to a thin band so only a slice of the glyphs shows, repeated in
   alternating ink/accent strokes, reading like a vertical reflection of the
   focal word. Geometry (band heights + offsets) is ported 1:1 from the Figma
   layers as em ratios of the masthead size, so the slices line up at any scale.
   The design's fixed coral/grey are mapped to the site's muted ink + dynamic
   accent to stay on-brand with the rest of /about. CSS-only layout; one on-load
   reveal gated to motion-allowed, holds visible under reduced motion. No photo. */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { TransitionLink } from "@/components/transitions";
import { useAccentColor } from "@/lib/AccentColorContext";
import styles from "./Echo.module.css";

const WORD = "ABOUT ME";

// Outline strokes alternate outward from the solid centre: ink, accent, ink.
// Top rows render outer→inner (matching the Figma "third/second/first layer"
// order); bottom rows render inner→outer.
const TOP_ROWS = ["ink", "accent", "ink"] as const;
const BOTTOM_ROWS = ["ink", "accent", "ink"] as const;

export function AboutPageHeroEcho() {
  const { color: currentAccent } = useAccentColor();
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const echoes = gsap.utils.toArray<HTMLElement>("[data-echo]", section);

        // On-load reveal: the solid word slides up, the echoes fade in from the
        // centre out, then the chrome settles.
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 24 });
        gsap.set("[data-solid]", { yPercent: 115 });
        gsap.set(echoes, (_i: number, el: HTMLElement) => ({
          autoAlpha: 0,
          y: el.dataset.dir === "up" ? -16 : 16,
        }));

        const intro = gsap.timeline({ delay: 0.1 });
        intro
          .to("[data-solid]", { yPercent: 0, duration: 1, ease: "expo.out" })
          .to(
            echoes,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              stagger: { each: 0.07, from: "center" },
            },
            "-=0.65",
          )
          .to(
            "[data-reveal]",
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              ease: "expo.out",
              stagger: 0.12,
            },
            "-=0.8",
          );

        // Scroll crop: pin the hero and crop every echo row away with a
        // `clip-path` inset — top rows retract upward (the band closes from the
        // bottom edge so its content recedes off the top), bottom rows retract
        // downward. Because clip-path never reflows, the rows hold their layout
        // slots and the solid word in the middle stays perfectly intact. Each
        // row crops at its own rate — the outer echoes (the faint tails) close
        // fastest, the inner ones nearest the word linger longest — so the stack
        // peels away from the outside in. The slowest row finishes exactly as
        // the pin releases, then normal scroll resumes. `immediateRender: false`
        // keeps the scrub from clobbering the intro before the user scrolls.
        const merge = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=120%",
            pin: true,
            scrub: 0.6,
          },
        });
        const maxRank = (echoes.length - 1) / 2;
        echoes.forEach((row, i) => {
          // rank = distance from the centre of the stack (0 = innermost).
          const rank = Math.abs(i - maxRank);
          // Retract toward the outer edge: top rows close from the bottom up,
          // bottom rows close from the top down.
          const closed =
            row.dataset.dir === "up"
              ? "inset(0% 0% 100% 0%)"
              : "inset(100% 0% 0% 0%)";
          merge.fromTo(
            row,
            { clipPath: "inset(0% 0% 0% 0%)" },
            {
              clipPath: closed,
              ease: "power1.in",
              duration: 0.5 + (maxRank - rank) * 0.3,
              immediateRender: false,
            },
            0,
          );
        });

        return () => {
          intro.kill();
          merge.scrollTrigger?.kill();
          merge.kill();
        };
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className={styles.hero}>
      <h1 className={styles.srOnly}>About — Mohed Abbas</h1>

      <div className={styles.top} data-reveal>
        <TransitionLink
          href="/"
          className={styles.backLink}
          aria-label="Back to home"
          payload={{ accent: currentAccent }}
        >
          <span aria-hidden="true">←</span>
        </TransitionLink>
      </div>

      <div className={styles.stage} aria-hidden="true">
        <div className={styles.stack}>
          {TOP_ROWS.map((tone, i) => (
            <div
              key={`t${i}`}
              className={`${styles.echoRow} ${styles[tone]}`}
              data-band="top"
              data-echo
              data-dir="up"
            >
              <span className={styles.echoText}>{WORD}</span>
            </div>
          ))}

          <div className={styles.solid} data-band="solid">
            <span className={styles.solidText} data-solid>
              <span className={styles.solidInk}>ABOUT</span>{" "}
              <span className={styles.solidAccent}>ME</span>
            </span>
          </div>

          {BOTTOM_ROWS.map((tone, i) => (
            <div
              key={`b${i}`}
              className={`${styles.echoRow} ${styles[tone]}`}
              data-band="bottom"
              data-echo
              data-dir="down"
            >
              <span className={styles.echoText}>{WORD}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
