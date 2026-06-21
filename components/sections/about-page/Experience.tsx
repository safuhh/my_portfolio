"use client";

/* ABOUT PAGE · Experience
   A numbered editorial list in the case-study reading rhythm: index + role
   on the left, org / period / stack on the right. Rows fade in on scroll.
   From content.about.experience (placeholder rows carry a dagger). */

import { useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { animationConfig, content } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import styles from "./Experience.module.css";

const cs = animationConfig.caseStudy;

export function AboutPageExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLLIElement[]>([]);
  rowRefs.current = [];
  const setRow = (el: HTMLLIElement | null) => {
    if (el && !rowRefs.current.includes(el)) rowRefs.current.push(el);
  };
  const { experience } = content.about;

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      { targets: [headRef], y: cs.blockFade.yShort, duration: cs.blockFade.durationShort },
      {
        targets: experience.map((_, i) => ({
          get current() {
            return rowRefs.current[i] ?? null;
          },
        })),
        y: cs.blockFade.yMedium,
        duration: cs.blockFade.durationLong,
        stagger: 0.1,
        delay: 0.1,
      },
    ],
  });

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        <div ref={headRef} className={styles.head}>
          <SectionLabel className={styles.eyebrow}>Experience</SectionLabel>
          <span className={styles.count}>{String(experience.length).padStart(2, "0")}</span>
        </div>

        <ol className={styles.list}>
          {experience.map((e, i) => (
            <li ref={setRow} className={styles.row} key={e.role + e.org}>
              <span className={styles.no}>{String(i + 1).padStart(2, "0")}</span>
              <div className={styles.main}>
                <h3 className={styles.role}>
                  {e.role}
                  {e.placeholder && <i className={styles.dagger}>†</i>}
                </h3>
                <p className={styles.summary}>{e.summary}</p>
                {e.points && (
                  <ul className={styles.points}>
                    {e.points.map((pt) => (
                      <li key={pt} className={styles.point}>{pt}</li>
                    ))}
                  </ul>
                )}
                {e.tags && (
                  <ul className={styles.tags}>
                    {e.tags.map((t) => (
                      <li className={styles.tag} key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={styles.aside}>
                <span className={styles.org}>{e.org}</span>
                <span className={styles.period}>{e.period}</span>
                <span className={styles.kind}>{e.kind}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
