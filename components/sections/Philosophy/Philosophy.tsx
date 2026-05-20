'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, ANIMATION_CONFIG } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content } from '@/data';
import { RevealText } from './RevealText';
import styles from './Philosophy.module.css';

export function Philosophy() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(() => {
    if (reducedMotion) return;
    if (!wrapperRef.current || !sectionRef.current || !labelRef.current) return;

    // Meta-label entrance animation
    const labelTween = gsap.from(labelRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
      },
      x: -50,
      opacity: 0,
      duration: 1.5,
      ease: ANIMATION_CONFIG.ease.outQuart,
    });

    // Pin the section while user reads
    const pinTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=50%',
      pin: true,
      pinSpacing: true,
    });

    // Parallax exit animation - section scrolls slower after pin ends.
    // Use a functional start so the value re-evaluates on every refresh
    // (resize, font-load), keeping the parallax aligned with the live
    // pinTrigger.end. invalidateOnRefresh forces the tween to discard cached
    // values and re-pull start/end on refresh.
    const parallaxTween = gsap.to(sectionRef.current, {
      scrollTrigger: {
        trigger: wrapperRef.current,
        start: () => `top+=${pinTrigger.end}px top`,
        end: 'bottom bottom',
        scrub: 2.5,
        invalidateOnRefresh: true,
      },
      yPercent: -35,
      force3D: true,
      ease: 'none',
    });

    // PERF: Explicit cleanup to prevent memory leaks
    return () => {
      pinTrigger.kill();
      if (labelTween.scrollTrigger) labelTween.scrollTrigger.kill();
      if (parallaxTween.scrollTrigger) parallaxTween.scrollTrigger.kill();
    };
  }, { scope: wrapperRef, dependencies: [reducedMotion] });

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <section ref={sectionRef} className={styles.section} id="philosophy">
        <div ref={labelRef} className={styles.metaLabel}>
          <svg
            className={styles.starIcon}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 0C12 0 14.5 9.5 24 12C14.5 14.5 12 24 12 24C12 24 9.5 14.5 0 12C9.5 9.5 12 0 12 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {content.philosophy.label}
        </div>
        <RevealText
          text={content.philosophy.statement}
          highlights={content.philosophy.highlights}
        />
      </section>
    </div>
  );
}
