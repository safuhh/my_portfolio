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
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 24 });
        gsap.set("[data-solid]", { yPercent: 115 });
        gsap.set("[data-echo]", (_i: number, el: HTMLElement) => ({
          autoAlpha: 0,
          y: el.dataset.dir === "up" ? -16 : 16,
        }));

        const tl = gsap.timeline({ delay: 0.1 });
        tl.to("[data-solid]", { yPercent: 0, duration: 1, ease: "expo.out" })
          .to(
            "[data-echo]",
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

        return () => tl.kill();
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
