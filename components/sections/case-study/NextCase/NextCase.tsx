"use client";

import Image from "next/image";
import styles from "./NextCase.module.css";

export function NextCase() {
  // CR-02: Permitto isn't ready yet. Rendering an <a href="#"> with
  // preventDefault is a footgun — middle-click / Cmd-click / right-click
  // → "Open in new tab" all bypass the onClick handler and open
  // `/work/tasktrox#`, dumping the user back at the top of the page
  // they were just on. Render as a non-link container instead so there
  // is no href for the browser to navigate to and no link semantics
  // exposed to assistive tech. The visual treatment (hover invert,
  // grayscale → colour image) is driven by .link CSS rules which still
  // apply to the <div>.
  return (
    <nav className={styles.next} aria-label="Next case study">
      <div className={styles.link} aria-disabled="true" role="group">
        <div className={styles.left}>
          <span className={styles.eyebrow}>Next case · 02 / 02</span>
          <h2 className={styles.title}>
            PERMITTO<span className={styles.titleAccent}>.</span>
          </h2>
          <div className={styles.metaPills}>
            <span className={styles.pill}>2025</span>
            <span className={styles.pill}>Fintech</span>
            <span className={`${styles.pill} ${styles.pillSolid}`}>
              Read case →
            </span>
          </div>
        </div>
        <div className={styles.imageWrap}>
          {/* WR-06: until the real Permitto asset lands, the placeholder
              image is a Tasktrox screen. Announce it accurately rather
              than lie to AT users about what's on screen. */}
          <Image
            className={styles.image}
            src="/images/work/tasktrox/Product.jpg"
            alt="Tasktrox product surface, Permitto case study coming soon"
            width={2400}
            height={1500}
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          <span className={styles.badge} aria-hidden>
            Live
            <br />
            Demo
          </span>
        </div>
      </div>
    </nav>
  );
}
