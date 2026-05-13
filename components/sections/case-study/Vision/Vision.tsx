"use client";

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import { SectionLabel } from "../SectionLabel";
import styles from "./Vision.module.css";

const cs = animationConfig.caseStudy;

export function Vision() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [eyebrowRef],
        y: cs.blockFade.yShort,
        duration: cs.blockFade.durationShort,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });
  useWordLineReveal(colRef, { scope: sectionRef, delay: 0.15 });

  return (
    <section
      ref={sectionRef}
      className={styles.vision}
      aria-labelledby="vision-eyebrow"
    >
      <div className={styles.head}>
        <SectionLabel
          ref={eyebrowRef}
          id="vision-eyebrow"
          className={styles.eyebrow}
        >
          The Vision
        </SectionLabel>
        <h2 ref={titleRef} className={styles.title}>
          A workspace that{" "}
          <span className={styles.titleUnderline}>respects</span>
          <br />
          the <span className={styles.titleAccent}>craft.</span>
        </h2>
      </div>

      <div ref={colRef} className={styles.col}>
        <p>
          Three principles shaped every screen.{" "}
          <strong>One: replace dashboards with documents.</strong> A studio
          thinks in artifacts, not metrics, so the product treats every
          project as a living folio you can mark up, not a feed you scroll
          past.
        </p>
        <p>
          <strong>Two: make the chrome quiet.</strong> Toolbars and toasts
          that earn their pixels. State changes that read as movement, not
          noise. <strong>Three: keep the tool truthful.</strong> If a number
          is provisional, say so. If a milestone slipped, show the slippage
          rather than recolour the badge.
        </p>
      </div>
    </section>
  );
}
