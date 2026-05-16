"use client";

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import type { ContextContent } from "@/data";
import { renderInline } from "@/lib/renderInline";
import { SectionLabel } from "../SectionLabel";
import styles from "./Context.module.css";

const cs = animationConfig.caseStudy;

export const Context = ({ label, facts, body }: ContextContent) => {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [innerRef],
        y: cs.blockFade.yTall,
        duration: cs.blockFade.durationLong,
      },
    ],
  });

  useWordLineReveal(colRef, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className={styles.context}
      aria-labelledby="context-eyebrow"
    >
      <aside className={styles.margin}>
        <div ref={innerRef} className={styles.marginInner}>
          <SectionLabel id="context-eyebrow" className={styles.eyebrow}>
            {label}
          </SectionLabel>
          {facts.map((fact) => (
            <div key={fact} className={styles.fact}>
              {renderInline(fact)}
            </div>
          ))}
        </div>
      </aside>

      <div ref={colRef} className={styles.col}>
        {body.map((paragraph, i) => (
          <p key={i} className={i === 0 ? styles.lede : undefined}>
            {renderInline(paragraph)}
          </p>
        ))}
      </div>
    </section>
  );
};
