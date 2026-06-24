"use client";

/* ABOUT PAGE · Colophon
   The close, mirroring the case-study Colophon: a ledger of vitals beside a
   short sign-off and actions. This is the most literal "ledger in the mix",
   a spec sheet that ends the document. From content.about + navigation. */

import { useId, useRef } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { TransitionLink } from "@/components/transitions";
import { useAccentColor } from "@/lib/AccentColorContext";
import { animationConfig, content, navigation } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import styles from "./Colophon.module.css";

const cs = animationConfig.caseStudy;
const basedIn = navigation.location.replace(/^based in\s*/i, "");

export function AboutPageColophon() {
  const { color: currentAccent } = useAccentColor();
  const sectionRef = useRef<HTMLElement>(null);
  const leftEyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const creditsRef = useRef<HTMLDListElement>(null);
  const rightEyebrowRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const eyebrowId = useId();

  const credits = [
    { role: "Name", value: "Muhammed Safvan" },
    { role: "Role", value: content.hero.title },
    { role: "Status", value: "Full time" },
    { role: "Based in", value: basedIn },
  ];

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

  return (
    <section ref={sectionRef} className={styles.colophon} aria-labelledby={eyebrowId}>
      <div className={styles.inner}>
        <div>
          <SectionLabel ref={leftEyebrowRef} id={eyebrowId} className={styles.eyebrow}>
            Colophon
          </SectionLabel>
          <h2 ref={titleRef} className={styles.title}>
            Built end to end,{" "}
            <span className={styles.titleAccent}>shipped for real.</span>
          </h2>
          <dl ref={creditsRef} className={styles.credits}>
            {credits.map((c) => (
              <div key={c.role} className={styles.credit}>
                <dt>{c.role}</dt>
                <dd>{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.side}>
          <SectionLabel ref={rightEyebrowRef} className={styles.eyebrow}>
            Get in touch
          </SectionLabel>
          <p className={styles.signoff}>
            Have a product to build or a role to fill? Let&apos;s talk.
          </p>
          <div ref={actionsRef} className={styles.actions}>
            <a
              href={`mailto:${content.contact.fallback.email}`}
              className={`${styles.pill} ${styles.pillSolid}`}
            >
              Contact
            </a>
            <TransitionLink
              href="/work2"
              className={styles.pill}
              payload={{ accent: currentAccent }}
            >
              Selected work
            </TransitionLink>
            <TransitionLink
              href="/"
              className={`${styles.pill} ${styles.pillGhost}`}
              payload={{ accent: currentAccent }}
            >
              Back to home
            </TransitionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
