"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { useBlockFadeIn } from "@/lib/useBlockFadeIn";
import { useWordLineReveal } from "@/lib/useWordLineReveal";
import { animationConfig } from "@/data";
import { SectionLabel } from "../SectionLabel";
import styles from "./Toggle.module.css";

const cs = animationConfig.caseStudy;

type Mode = "gallery" | "list";

type Screen = {
  src: string;
  alt: string;
  galleryCaption?: { label: string };
  list: { num: string; name: string; desc: string; meta: string };
};

const SCREENS: readonly Screen[] = [
  {
    src: "/images/work/tasktrox/Hero.jpg",
    alt: "Marketing landing",
    list: {
      num: "01",
      name: "Marketing landing",
      desc: "Hero composition, scroll-led greeting",
      meta: "2400 × 1500",
    },
  },
  {
    src: "/images/work/tasktrox/Dashboard.jpg",
    alt: "Studio dashboard",
    list: {
      num: "02",
      name: "Studio dashboard",
      desc: "Sectional header + living grid",
      meta: "2400 × 1500",
    },
  },
  {
    src: "/images/work/tasktrox/Product.jpg",
    alt: "Product surface",
    galleryCaption: { label: "02 · Product surface" },
    list: {
      num: "03",
      name: "Product surface",
      desc: "Card system, 8-pt grid",
      meta: "2400 × 1500",
    },
  },
  {
    src: "/images/work/tasktrox/About.jpg",
    alt: "Studio profile",
    galleryCaption: { label: "03 · Studio profile" },
    list: {
      num: "04",
      name: "Studio profile",
      desc: "Folio-style team page",
      meta: "2400 × 1500",
    },
  },
  {
    src: "/images/work/tasktrox/Price.jpg",
    alt: "Pricing",
    galleryCaption: { label: "04 · Pricing" },
    list: {
      num: "05",
      name: "Pricing",
      desc: "Three tiers, no asterisks",
      meta: "2400 × 1500",
    },
  },
  {
    src: "/images/work/tasktrox/testimonials.jpg",
    alt: "Testimonials",
    galleryCaption: { label: "05 · Testimonials" },
    list: {
      num: "06",
      name: "Testimonials",
      desc: "Studio quotes, marginalia",
      meta: "2400 × 1500",
    },
  },
  {
    src: "/images/work/tasktrox/footer.jpg",
    alt: "Footer marquee",
    galleryCaption: { label: "06 · Footer marquee" },
    list: {
      num: "07",
      name: "Footer marquee",
      desc: "Closing flourish",
      meta: "2400 × 1500",
    },
  },
] as const;

type GalleryScreen = Screen & { galleryCaption: NonNullable<Screen["galleryCaption"]> };
type GalleryEntry = { screen: GalleryScreen; indexInAll: number };

const TOTAL_PAD = String(SCREENS.length).padStart(2, "0");

const GALLERY_ENTRIES: readonly GalleryEntry[] = SCREENS.flatMap((s, i) =>
  s.galleryCaption ? [{ screen: s as GalleryScreen, indexInAll: i }] : []
);

export function Toggle() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const modeButtonsRef = useRef<Record<Mode, HTMLButtonElement | null>>({
    gallery: null,
    list: null,
  });

  const [mode, setMode] = useState<Mode>("gallery");

  const selectMode = (target: Mode) => {
    setMode(target);
    requestAnimationFrame(() => modeButtonsRef.current[target]?.focus());
  };

  // 2-radio group: prev/next collapse to "the other one"; arrow handlers are
  // intentionally symmetric. Kept as one case so the WAI-ARIA contract is
  // explicit and trivially extends if a third mode is added.
  const handleModeKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        selectMode(mode === "gallery" ? "list" : "gallery");
        break;
      case "Home":
        e.preventDefault();
        selectMode("gallery");
        break;
      case "End":
        e.preventDefault();
        selectMode("list");
        break;
    }
  };
  // Preview position is updated via direct style mutation in
  // handleRowMove rather than React state — pumping setState on every
  // mousemove forces a re-render of all 24 list rows + the gallery.
  // Visibility + src still go through state because they change rarely.
  const [preview, setPreview] = useState<{ visible: boolean; src: string }>(
    { visible: false, src: "" }
  );

  useBlockFadeIn(sectionRef, {
    start: cs.scrollTrigger.early,
    groups: [
      {
        targets: [modesRef, viewRef],
        y: cs.blockFade.yTall,
        duration: cs.blockFade.durationLong,
        stagger: 0.08,
      },
    ],
  });

  useWordLineReveal(titleRef, { scope: sectionRef });

  const movePreview = (clientX: number, clientY: number) => {
    const el = previewRef.current;
    if (!el) return;
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
  };
  const handleRowEnter = (src: string) => (e: React.MouseEvent) => {
    movePreview(e.clientX, e.clientY);
    setPreview({ visible: true, src });
  };
  const handleRowLeave = () => setPreview((p) => ({ ...p, visible: false }));
  const handleRowMove = (e: React.MouseEvent) => {
    movePreview(e.clientX, e.clientY);
  };

  return (
    <section
      ref={sectionRef}
      className={styles.toggle}
      aria-labelledby="toggle-eyebrow"
    >
      <div className={styles.controls}>
        <div>
          <SectionLabel id="toggle-eyebrow" className={styles.eyebrow}>
            The Build
          </SectionLabel>
          <h2 ref={titleRef} className={styles.title}>
            All <span className={styles.titleAccent}>{SCREENS.length}</span> screens.
          </h2>
        </div>

        <div
          ref={modesRef}
          className={styles.modes}
          role="radiogroup"
          aria-label="View mode"
        >
          <button
            type="button"
            ref={(el) => { modeButtonsRef.current.gallery = el; }}
            className={styles.modeBtn}
            role="radio"
            aria-checked={mode === "gallery"}
            tabIndex={mode === "gallery" ? 0 : -1}
            onClick={() => selectMode("gallery")}
            onKeyDown={handleModeKey}
          >
            Gallery
          </button>
          <button
            type="button"
            ref={(el) => { modeButtonsRef.current.list = el; }}
            className={styles.modeBtn}
            role="radio"
            aria-checked={mode === "list"}
            tabIndex={mode === "list" ? 0 : -1}
            onClick={() => selectMode("list")}
            onKeyDown={handleModeKey}
          >
            List
          </button>
        </div>
      </div>

      <div ref={viewRef}>
        {mode === "gallery" ? (
          <div className={styles.gallery}>
            {GALLERY_ENTRIES.map(({ screen: s, indexInAll }) => (
              <figure key={s.src}>
                <div className={styles.frame}>
                  <Image
                    src={s.src}
                    alt={s.alt}
                    width={2400}
                    height={1500}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                </div>
                <figcaption className={styles.caption}>
                  <span>{s.galleryCaption.label}</span>
                  <span>
                    {String(indexInAll + 1).padStart(2, "0")} / {TOTAL_PAD}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {SCREENS.map((s) => (
              <div
                key={s.src}
                className={styles.row}
                onMouseEnter={handleRowEnter(s.src)}
                onMouseLeave={handleRowLeave}
                onMouseMove={handleRowMove}
              >
                <span className={styles.rowN}>{s.list.num}</span>
                <span className={styles.rowName}>{s.list.name}</span>
                <span className={styles.rowDesc}>{s.list.desc}</span>
                <span className={styles.rowMeta}>{s.list.meta}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cursor-following hover preview (list mode only) */}
      <div
        ref={previewRef}
        className={`${styles.preview} ${preview.visible ? styles.previewVisible : ""}`}
        aria-hidden
      >
        {preview.src && (
          <Image src={preview.src} alt="" width={560} height={400} sizes="280px" />
        )}
      </div>
    </section>
  );
}
