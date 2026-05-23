'use client';

import { Fragment, useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import Image from 'next/image';
import { TransitionLink } from '@/components/transitions';
import styles from './Projects.module.css';
import { content, getCaseStudySlugs } from '@/data';

const caseStudySlugs = new Set(getCaseStudySlugs());

export const Projects = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { projects } = content;
  const featuredProjects = projects.items.filter((project) => project.featured);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = gsap.context(() => {
        const sections = container.querySelectorAll<HTMLElement>(`.${styles.projectSection}`);

        sections.forEach((section) => {
            const topPart = section.querySelector(`.${styles.textTop}`);
            const botPart = section.querySelector(`.${styles.textBottom}`);
            const imgCard = section.querySelector(`.${styles.imageCard}`);
            const imgWrapper = section.querySelector(`.${styles.projectImgWrapper}`);
            const badge = section.querySelector(`.${styles.funkyBadge}`);
            const meta = section.querySelector(`.${styles.projectMeta}`);
            const metaLabel = section.querySelector(`.${styles.metaLabel}`); // null on non-first projects
            const stickyContainer = section.querySelector(`.${styles.projectSticky}`);

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 2.5,
                    pin: stickyContainer,
                    // No background color changes - InteractiveBackground shows through entirely
                }
            });

            // 0. META LABEL EXIT — slide up and fade as THE SNAP begins, so
            //    the "Selected Works" caption doesn't fight the split-title
            //    animation. Only the first project has a label; guard skips
            //    the others. Short duration (0.2 vs the default 0.5) so the
            //    label is gone by ~20% scroll — well before the dramatic
            //    image-pop. Symmetric inOut ease for the smoothest perceived
            //    motion.
            if (metaLabel) {
                tl.to(metaLabel, {
                    y: -60,
                    opacity: 0,
                    duration: 0.2,
                    force3D: true,
                    ease: "power2.inOut",
                }, "start");
            }

            // 1. THE SNAP (Rotate and Separate)
            // PERF: Added force3D for consistent GPU compositing
            tl.to(topPart, {
                yPercent: -45,
                rotation: -5, // Rotate Left
                force3D: true,
                ease: "power2.inOut",
            }, "start")
            .to(botPart, {
                yPercent: 45,
                rotation: 5, // Rotate Right
                force3D: true,
                ease: "power2.inOut",
            }, "start");

            // 2. IMAGE POP (Scale and Straighten)
            tl.to(imgCard, {
                scale: 1,
                rotation: 0, // Straighten out
                opacity: 1,
                force3D: true,
                ease: "back.out(1.2)" // Bouncy effect
            }, "start+=0.05");

            // 3. INNER PARALLAX
            tl.to(imgWrapper, {
                scale: 1.1,
                force3D: true,
                ease: "none"
            }, "start");

            // 4. BADGE SPIN IN
            tl.to(badge, {
                scale: 1,
                rotation: 360,
                force3D: true,
                ease: "elastic.out(1, 0.5)"
            }, "start+=0.3");

            // 5. META FADE
            tl.to(meta, {
                opacity: 1,
                y: 0,
                force3D: true,
                duration: 0.2
            }, "start+=0.4");
        });
    }, containerRef);

    return () => ctx.revert();
  }, [projects]);

  return (
    <div ref={containerRef} className={styles.section} id='projects'>
       {featuredProjects.map((project, index) => {
           const isFirst = index === 0;
           const cardInner = (
               <>
                   {isFirst && (
                     <div className={styles.metaLabel} aria-hidden="true">
                       <svg
                         className={styles.starIcon}
                         viewBox="0 0 24 24"
                         fill="none"
                         xmlns="http://www.w3.org/2000/svg"
                       >
                         <path
                           d="M12 0C12 0 14.5 9.5 24 12C14.5 14.5 12 24 12 24C12 24 9.5 14.5 0 12C9.5 9.5 12 0 12 0Z"
                           stroke="currentColor"
                           strokeWidth="1.5"
                           strokeLinejoin="round"
                           fill="none"
                         />
                       </svg>
                       {projects.label}
                     </div>
                   )}

                   {/* Image */}
                   <div className={styles.imageCard}>
                        <div className={styles.projectImgWrapper}>
                             <Image
                                src={project.image}
                                alt={project.title}
                                fill
                                // unoptimized
                                style={{ objectFit: 'cover', objectPosition: 'top', objectViewBox: '0 0 800 600' }}
                                sizes="(max-width: 768px) 100vw, 80vw"
                                priority={false}
                             />
                        </div>
                   </div>

                   {/* Funky Badge */}
                   <div
                    className={styles.funkyBadge}
                    style={{
                        backgroundColor: project.badgeColor,
                        color: project.badgeTextColor,
                        boxShadow: `5px 5px 0px ${project.badgeShadowColor || 'black'}`
                    }}
                   >
                       <span>
                           {project.badge.split(/<br\s*\/?>/i).map((line, i, arr) => (
                               <Fragment key={i}>
                                   {line}
                                   {i < arr.length - 1 && <br />}
                               </Fragment>
                           ))}
                       </span>
                   </div>

                   {/* Text Splitter */}
                   <div className={styles.titleWrapper}>
                        <div className={styles.textTop}>
                            <div className={styles.textBacking}></div>
                            <div className={styles.textContent}>{project.title}</div>
                        </div>
                        <div className={styles.textBottom}>
                            <div className={styles.textBacking}></div>
                            <div className={styles.textContent}>{project.title}</div>
                        </div>
                   </div>

                   {/* Meta */}
                   <div className={styles.projectMeta}>
                       <div className={styles.pill}>{project.year}</div>
                       <div className={styles.pill}>{project.category}</div>
                   </div>
               </>
           );

           return (
               <div
                 key={project.id}
                 className={styles.projectSection}
                 data-color={project.themeColor}
               >
                   {caseStudySlugs.has(project.id) ? (
                       <TransitionLink
                         href={`/work/${project.id}`}
                         className={styles.projectSticky}
                         aria-label={`Open ${project.title} case study`}
                         payload={{
                           accent: project.themeColor,
                           title: project.title,
                           slug: project.id,
                           year: project.year,
                           category: project.category,
                         }}
                       >
                           {cardInner}
                       </TransitionLink>
                   ) : (
                       <div className={styles.projectSticky}>
                           {cardInner}
                       </div>
                   )}
               </div>
           );
       })}

       <div className={styles.spacer}></div>
    </div>
  );
};
