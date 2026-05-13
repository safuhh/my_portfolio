"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const image = imageRef.current;
      if (!section || !image) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Pin the section for an extra 80vh of scroll while the image
        // does a subtle parallax (scale 1.06 → 1.0, y -3% → 3%).
        // CSS sticky doesn't work in this project (overflow-x:hidden
        // on body promotes body to sticky scroll-ancestor while Lenis
        // scrolls html), so ScrollTrigger.pin with pinType:"fixed" is
        // used in its place.
        const tl = gsap.timeline().fromTo(
          image,
          { scale: 1.06, yPercent: -3 },
          { scale: 1, yPercent: 3, ease: "none", duration: 1 },
          0
        );

        const pin = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * 0.8,
          pin: true,
          pinType: "fixed",
          scrub: true,
          animation: tl,
          anticipatePin: 1,
        });

        return () => {
          // WR-01: ScrollTrigger.kill() defaults revert:false, which
          // leaves the bound timeline (and its inner fromTo tween that
          // holds a ref to `image`) alive across remounts. Pass true so
          // the timeline + tween are killed alongside the trigger —
          // same teardown-leak class as the Hero pin cleanup.
          pin.kill(true);
          gsap.set(image, { clearProps: "all" });
        };
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className={styles.dashboard}
      aria-label="Tasktrox studio dashboard"
    >
      <figure className={styles.frame}>
        <Image
          ref={imageRef}
          className={styles.image}
          src="/images/work/tasktrox/Dashboard.jpg"
          alt="Tasktrox studio dashboard"
          width={2400}
          height={1500}
          sizes="(min-width: 1512px) 1440px, 100vw"
        />
        <span className={styles.badge} aria-hidden>
          Live
          <br />
          Demo
        </span>
        <span className={styles.corner}>
          Fig. 04 · Studio dashboard · 06 / 24
        </span>
      </figure>
    </section>
  );
}
