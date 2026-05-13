"use client";

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import { SectionLabel } from "../SectionLabel";
import styles from "./Product.module.css";

const cs = animationConfig.caseStudy;

export function Product() {
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
      className={styles.product}
      aria-labelledby="product-eyebrow"
    >
      <div className={styles.head}>
        <div className={styles.row}>
          <SectionLabel
            ref={eyebrowRef}
            id="product-eyebrow"
            className={styles.eyebrow}
          >
            The Product
          </SectionLabel>
          <h2 ref={titleRef} className={styles.title}>
            The dashboard,
            <br />
            read like a <span className={styles.titleAccent}>plate.</span>
          </h2>
        </div>
      </div>

      <div ref={colRef} className={styles.col}>
        <p>
          The dashboard treats every project as an architectural plate.{" "}
          <strong>
            Sectional header, living grid, margin notes
          </strong>{" "}
          the right rail is for context, never controls, lifted directly
          from the way studios annotate drawings.
        </p>
        <p>
          Cards align to the 8-pt grid but breathe within it. No two states
          look identical without reason. Motion is 240ms expo.out, fast
          enough to feel earned, slow enough to read.
        </p>
      </div>
    </section>
  );
}
