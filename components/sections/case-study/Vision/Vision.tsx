"use client";

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { VisionContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { SectionLabel } from "../SectionLabel";
import styles from "./Vision.module.css";

const cs = animationConfig.caseStudy;

// titleLine1 carries the word ('respects') that originally lived inside a
// <span className={styles.titleUnderline}>. The data layer is flat strings,
// so the underline is re-applied here by wrapping the trailing word of
// titleLine1 in the underline span. If titleLine1 is a single word, that
// word receives the underline; otherwise the underline lands on the last
// word and the preceding text renders plain.
function renderUnderlinedTitleLine1(line: string) {
  const lastSpace = line.lastIndexOf(" ");
  if (lastSpace === -1) {
    return <span className={styles.titleUnderline}>{line}</span>;
  }
  const head = line.slice(0, lastSpace + 1);
  const tail = line.slice(lastSpace + 1);
  return (
    <>
      {head}
      <span className={styles.titleUnderline}>{tail}</span>
    </>
  );
}

export const Vision = ({
  label,
  titleLine1,
  titleLine2,
  titleAccent,
  body,
}: VisionContent) => {
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
          {label}
        </SectionLabel>
        <h2 ref={titleRef} className={styles.title}>
          {renderUnderlinedTitleLine1(titleLine1)}
          <br />
          {titleLine2}{" "}
          <span className={styles.titleAccent}>{titleAccent}</span>
        </h2>
      </div>

      <div ref={colRef} className={styles.col}>
        {body.map((paragraph, i) => (
          <p key={i}>{renderInline(paragraph)}</p>
        ))}
      </div>
    </section>
  );
};
