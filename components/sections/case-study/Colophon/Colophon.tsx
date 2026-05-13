"use client";

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import { SectionLabel } from "../SectionLabel";
import styles from "./Colophon.module.css";

const cs = animationConfig.caseStudy;

type Credit = {
  role: string;
  primary: string;
  secondary?: string;
};

const CREDITS: readonly Credit[] = [
  { role: "Design Lead", primary: "Mohed Abbas", secondary: "Brand · Product · Motion" },
  { role: "Engineering", primary: "Aria Cole", secondary: "Sven Ortega" },
  { role: "Product", primary: "Mira Tarek", secondary: "Strategy & PM" },
  { role: "Special thanks", primary: "Atelier Marchand", secondary: "Studio Petralla, Cadence Works" },
] as const;

export function Colophon() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftEyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const creditsRef = useRef<HTMLDListElement>(null);
  const rightEyebrowRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.mid,
    groups: [
      {
        targets: [leftEyebrowRef, rightEyebrowRef],
        y: cs.blockFade.yShort,
        duration: cs.blockFade.durationShort,
        stagger: 0.06,
      },
      {
        targets: [creditsRef, actionsRef],
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationLong,
        stagger: 0.1,
        delay: 0.4,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });
  useWordLineReveal(bioRef, { scope: sectionRef, delay: 0.15 });

  return (
    <section
      ref={sectionRef}
      className={styles.colophon}
      aria-labelledby="colophon-eyebrow"
    >
      <div className={styles.inner}>
        <div>
          <SectionLabel
            ref={leftEyebrowRef}
            id="colophon-eyebrow"
            className={styles.eyebrow}
          >
            Colophon
          </SectionLabel>
          <h2 ref={titleRef} className={styles.title}>
            Made with a small{" "}
            <span className={styles.titleAccent}>circle.</span>
          </h2>
          <dl ref={creditsRef} className={styles.credits}>
            {CREDITS.map((c) => (
              <div key={c.role} className={styles.credit}>
                <dt>{c.role}</dt>
                <dd>{c.primary}</dd>
                {c.secondary && <dd>{c.secondary}</dd>}
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.bio}>
          <SectionLabel ref={rightEyebrowRef} className={styles.eyebrow}>
            About M.A
          </SectionLabel>
          <div ref={bioRef}>
            <p>
              Mohed Abbas is an independent designer working at the seam of
              brand, product and the small motion details that make software
              feel made. Selected work from 2018 → present.
            </p>
            <p>
              Currently taking on one new engagement per quarter, typically a
              6 to 14-week sprint covering identity, a flagship surface, and
              the design system that holds them together.
            </p>
          </div>
          <div ref={actionsRef} className={styles.actions}>
            <button
              type="button"
              className={`${styles.pill} ${styles.pillSolid}`}
            >
              Start a project →
            </button>
            <button type="button" className={styles.pill}>
              Read approach
            </button>
            <button
              type="button"
              className={`${styles.pill} ${styles.pillGhost}`}
            >
              All works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
