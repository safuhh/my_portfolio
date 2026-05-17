"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { TransitionLink } from "@/components/transitions";
import { getProjectThemeColor } from "@/data";
import type { CaseStudyHeroContent, NextCaseContent } from "@/data";
import styles from "./NextCase.module.css";

type NextCaseProps = NextCaseContent & {
  target?: Pick<CaseStudyHeroContent, "title" | "image" | "alt" | "year">;
};

export const NextCase = ({ slug, counter, target }: NextCaseProps) => {
  // CR-02: When the target case study isn't ready yet, rendering an
  // <a href="#"> with preventDefault is a footgun — middle-click /
  // Cmd-click / right-click → "Open in new tab" all bypass the onClick
  // handler and open the current page with a `#`, dumping the user back
  // at the top of the page they were just on. Render as a non-link
  // container instead so there is no href for the browser to navigate
  // to and no link semantics exposed to assistive tech. The visual
  // treatment (hover invert, grayscale → colour image) is driven by
  // .link CSS rules which still apply to the <div>.
  const inner: ReactNode = (
    <>
      <div className={styles.left}>
        <span className={styles.eyebrow}>{counter}</span>
        <h2 className={styles.title}>
          {target?.title ?? ""}
          <span className={styles.titleAccent}>.</span>
        </h2>
        <div className={styles.metaPills}>
          {target?.year && <span className={styles.pill}>{target.year}</span>}
          <span className={`${styles.pill} ${styles.pillSolid}`}>
            Read case →
          </span>
        </div>
      </div>
      <div className={styles.imageWrap}>
        {target?.image && (
          <Image
            className={styles.image}
            src={target.image}
            alt={target.alt}
            width={2400}
            height={1500}
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        )}
        <span className={styles.badge} aria-hidden>
          Live
          <br />
          Demo
        </span>
      </div>
    </>
  );

  return (
    <nav className={styles.next} aria-label="Next case study">
      {target ? (
        <TransitionLink
          href={`/work/${slug}`}
          className={styles.link}
          payload={{
            accent: getProjectThemeColor(slug),
            title: target.title,
            slug,
            year: target.year,
          }}
        >
          {inner}
        </TransitionLink>
      ) : (
        <div className={styles.link} aria-disabled="true" role="group">
          {inner}
        </div>
      )}
    </nav>
  );
};
