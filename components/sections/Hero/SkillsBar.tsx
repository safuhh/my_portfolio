'use client';

import { useRef, useEffect } from 'react';
import { content } from '@/data';
import { StarIcon } from './StarIcon';
import styles from './SkillsBar.module.css';

// Build repeating skills array from base items
const baseSkills = content.skills.marqueeItems;
const skills = [
  ...baseSkills,
  baseSkills[1], // UI/UX
  baseSkills[0], // INTERACTIVE
  baseSkills[2], // BRAND STRATEGY
  baseSkills[1], // UI/UX
];

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
      const skillItems = node.querySelectorAll(`.${styles.skillItem}`);
      const halfCount = skills.length;
      let totalWidth = 0;
      for (let i = 0; i < halfCount && i < skillItems.length; i++) {
        const item = skillItems[i] as HTMLElement;
        totalWidth += item.offsetWidth;
      }
      const computedStyle = getComputedStyle(node);
      const gap = parseFloat(computedStyle.gap) || 0;
      totalWidth += gap * halfCount;
      node.style.setProperty('--scroll-width', `${totalWidth}px`);
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
    <div className={styles.skillsBar} aria-hidden="true">
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
