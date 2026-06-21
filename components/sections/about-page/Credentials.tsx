"use client";

/* ABOUT PAGE · Credentials — "Under the hood" bordered-row layout.
   One de-duplicated, newest-first list of every credential, rendered in the
   case-study Architecture language: a bordered, rounded container of stacked
   rows. Each row has a header column (period + kind chip, credential name,
   institution) and a readable detail column. The RNCP state titles a degree
   confers live on the degree as "certified as" lines (↳), so they are never
   duplicated as their own rows. This merges what used to be two columns
   (Education + Certifications). From content.about.credentials. */

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { animationConfig, content } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import styles from "./Credentials.module.css";

const cs = animationConfig.caseStudy;

export function AboutPageCredentials() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLLIElement[]>([]);
  rowRefs.current = [];
  const setRow = (el: HTMLLIElement | null) => {
    if (el && !rowRefs.current.includes(el)) rowRefs.current.push(el);
  };
  const { credentials } = content.about;

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      { targets: [headRef], y: cs.blockFade.yShort, duration: cs.blockFade.durationShort },
      {
        targets: credentials.map((_, i) => ({
          get current() {
            return rowRefs.current[i] ?? null;
          },
        })),
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationLong,
        stagger: 0.08,
        delay: 0.1,
      },
    ],
  });

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        <div ref={headRef} className={styles.head}>
          <SectionLabel className={styles.eyebrow}>Credentials</SectionLabel>
          <span className={styles.count}>{String(credentials.length).padStart(2, "0")}</span>
        </div>

        <ol className={styles.stack}>
          {credentials.map((c) => (
            <li
              ref={setRow}
              key={c.credential + c.period}
              className={styles.entry}
              data-kind={c.kind.toLowerCase()}
            >
              <div className={styles.rowHead}>
                <div className={styles.rowTop}>
                  <span className={styles.year}>{c.period}</span>
                  <span className={styles.chip}>{c.kind}</span>
                </div>
                <h3 className={styles.credential}>{c.credential}</h3>
                <p className={styles.inst}>
                  <span>{c.institution}</span>
                  {c.status && <span className={styles.status}>{c.status}</span>}
                </p>
              </div>

              <div className={styles.rowBody}>
                {c.titles && (
                  <ul className={styles.titles}>
                    {c.titles.map((t) => (
                      <li key={t.label} className={styles.title}>
                        <span className={styles.titleArrow} aria-hidden="true">↳</span>
                        <span className={styles.titleLabel}>{t.label}</span>
                        <span className={styles.titleRef}>{t.ref}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {c.points && (
                  <ul className={styles.points}>
                    {c.points.map((pt) => (
                      <li key={pt} className={styles.point}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
