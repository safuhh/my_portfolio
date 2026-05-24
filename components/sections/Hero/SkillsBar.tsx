'use client';

import { useRef, useEffect } from 'react';
import { content } from '@/data';
import { StarIcon } from './StarIcon';
import styles from './SkillsBar.module.css';

// Build repeating skills array from base items.
// Duplicate the whole base list so the marquee tail is derived generically
// (no hardcoded indices) and stays well-defined for any data size. The render
// then duplicates `skills` once more, so the content is laid out twice and the
// seam-accurate loop distance is exactly scrollWidth / 2.
const baseSkills = content.skills.marqueeItems;
const skills = [...baseSkills, ...baseSkills];

export function SkillsBar() {
  const contentRef = useRef<HTMLDivElement>(null);

  // Write --scroll-width as a CSS variable directly instead of going through
  // setState — measurement has no UI consequence other than the var update,
  // and resize-driven setState re-renders the whole component including the
  // 2× skills list.
  useEffect(() => {
    const measureWidth = () => {
      const node = contentRef.current;
      if (!node) return;
      // Measure the true loop distance directly. The content is rendered twice
      // (skills + duplicate), so half the laid-out width is exactly one loop —
      // seam-accurate with no integer-rounded offsetWidth + gap accumulation.
      node.style.setProperty('--scroll-width', `${node.scrollWidth / 2}px`);
    };

    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, []);

  // Render a skill item with alternating star separator
  const renderSkillItem = (skill: string, index: number, keyPrefix: string = '') => (
    <div key={`${keyPrefix}${index}`} className={styles.skillItem}>
      <span className={styles.skillText}>{skill}</span>
      <span className={styles.separator}>
        <StarIcon variant={index % 2 === 0 ? 'outline' : 'filled'} />
      </span>
    </div>
  );

  return (
    <div data-skills className={styles.skillsBar} aria-hidden="true">
      <div className={styles.skillsBarInner}>
        <div className={styles.skillsWrapper}>
          <div ref={contentRef} className={styles.skillsContent}>
            {skills.map((skill, index) => renderSkillItem(skill, index))}
            {/* Duplicate for seamless loop */}
            {skills.map((skill, index) => renderSkillItem(skill, index, 'dup-'))}
          </div>
        </div>
      </div>
    </div>
  );
}
