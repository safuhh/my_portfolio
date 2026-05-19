'use client';

import { useRef, useState, useEffect, useMemo, FormEvent, ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content } from '@/data';
import styles from './Contact.module.css';

// One <span> per character so the typewriter reveal can tween each glyph
// independently. Text passed here MUST be static across re-renders — keys
// are positional, so dynamic text would smear GSAP's stored opacity values
// across the wrong glyphs.
function splitChars(text: string): ReactNode {
  return Array.from(text).map((ch, i) => (
    <span key={i} className={styles.char}>
      {ch === ' ' ? ' ' : ch}
    </span>
  ));
}

export function Contact() {
  const c = content.contact;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const reducedMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(c.row3.defaultSelected);
  const [emailError, setEmailError] = useState(false);

  useGSAP(() => {
    if (!wrapperRef.current || !panelRef.current || !formRef.current) return;

    const form = formRef.current;

    // Reduced motion: just show everything static, skip pin.
    if (reducedMotion) {
      gsap.set(form.querySelectorAll(`.${styles.char}`), { opacity: 1 });
      gsap.set(form.querySelectorAll(`.${styles.revealItem}`), { opacity: 1, y: 0 });
      gsap.set(form.querySelectorAll(`.${styles.inputBorder}`), { width: '100%' });
      gsap.set(form.querySelectorAll(`.${styles.submit}`), { opacity: 1, y: 0 });
      return;
    }

    const wrapper = wrapperRef.current;
    const panel = panelRef.current;

    // Scrub-driven master timeline. The panel pins at the top of the
    // viewport and the typewriter + input borders + chips + submit reveal
    // across +=400% of scroll distance. (Pinning at 'top top' rather than
    // 'top bottom' so the panel scrolls into view normally first; pinning
    // earlier would freeze it at the viewport bottom.)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: 'top top',
        end: '+=400%',
        pin: panel,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
      defaults: { ease: 'none' },
    });

    // ── Per-row reveal ────────────────────────────────────────────────────
    // Each row occupies 1 timeline unit. Inside that unit:
    //   chars   : t = [rowIdx + 0.00 → rowIdx + 0.65]   typewriter stagger
    //   borders : t = [rowIdx + 0.30 → rowIdx + 0.80]   input underline draws
    //   chips   : t = [rowIdx + 0.55 → rowIdx + 0.95]   chip group fades in
    //   gap     : t = [rowIdx + 0.95 → rowIdx + 1.00]   small breather
    // Borders draw IN SYNC with the surrounding text reveal — the underline
    // catches up to the letters that have just been typed, mirroring the
    // inspiration's overlap.
    const rows = form.querySelectorAll<HTMLElement>(`.${styles.row}`);
    rows.forEach((row, rowIdx) => {
      const start = rowIdx;
      const chars = row.querySelectorAll<HTMLElement>(`.${styles.char}`);
      const borders = row.querySelectorAll<HTMLElement>(`.${styles.inputBorder}`);
      const inputs = row.querySelectorAll<HTMLElement>(`.${styles.inputWrap}`);
      const chips = row.querySelectorAll<HTMLElement>(`.${styles.chip}`);

      if (chars.length) {
        tl.to(
          chars,
          { opacity: 1, duration: 0.65, stagger: { each: 0.018, from: 'start' } },
          start
        );
      }

      if (inputs.length) {
        tl.to(inputs, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, start + 0.25);
      }

      if (borders.length) {
        tl.to(borders, { width: '100%', duration: 0.5, stagger: 0.1 }, start + 0.3);
      }

      if (chips.length) {
        tl.to(chips, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, start + 0.55);
      }
    });

    // Submit at the end.
    const submit = form.querySelector<HTMLElement>(`.${styles.submit}`);
    if (submit) {
      tl.to(submit, { opacity: 1, y: 0, duration: 0.5 }, rows.length);
    }

    return () => {
      // kill(true) reverts the pin spacer; without it, Fast Refresh leaves
      // orphan spacer nodes that throw off subsequent layout.
      tl.scrollTrigger?.kill(true);
      tl.kill();
    };
  }, { scope: wrapperRef, dependencies: [reducedMotion] });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
    if (!emailOk) {
      setEmailError(true);
      return;
    }
    setEmailError(false);

    const subject = encodeURIComponent(`${topic ?? 'New message'} — ${name || 'A friend'}`);
    // CRLF is required by RFC 6068; Outlook collapses LF-only into one paragraph.
    const body = encodeURIComponent(
      [
        `Hi ${c.row1.recipient},`,
        '',
        `I'm ${name || '—'}, reaching out from ${country || '—'}.`,
        `Topic: ${topic ?? '—'}.`,
        `Best channel: ${channel ?? '—'} (${email || '—'}).`,
        '',
        message || '—',
      ].join('\r\n')
    );
    window.location.href = `mailto:${c.fallback.email}?subject=${subject}&body=${body}`;
  }

  // Memoize static splits — content is static, so this runs once.
  const splits = useMemo(() => ({
    row1Lead: splitChars(`${c.row1.greeting} ${c.row1.recipient}${c.row1.afterName} `),
    row1Between: splitChars(` ${c.row1.between} `),
    row2Lead: splitChars(`${c.row2.lead} `),
    row3Lead: splitChars(`${c.row3.lead} `),
    row4Lead: splitChars(`${c.row4.lead} `),
  }), [
    c.row1.greeting,
    c.row1.recipient,
    c.row1.afterName,
    c.row1.between,
    c.row2.lead,
    c.row3.lead,
    c.row4.lead,
  ]);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <section className={styles.section} id="contact">
        <h2 className={styles.srOnly}>Contact</h2>

        <div ref={panelRef} className={styles.panel}>
          <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Row 1 — greeting + name + country */}
            <div className={styles.row}>
              <span className={styles.text}>{splits.row1Lead}</span>
              <RevealInput
                value={name}
                onChange={setName}
                placeholder={c.row1.nameLabel}
                ariaLabel={c.row1.nameLabel}
                name="name"
              />
              <span className={styles.text}>{splits.row1Between}</span>
              <RevealInput
                value={country}
                onChange={setCountry}
                placeholder={c.row1.countryLabel}
                ariaLabel={c.row1.countryLabel}
                name="country"
              />
            </div>

            {/* Row 2 — topic chips */}
            <div className={styles.row}>
              <span className={styles.text}>{splits.row2Lead}</span>
              <div className={styles.chipGroup} role="group" aria-label="Topic">
                {c.row2.options.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={topic === opt}
                    onSelect={() => setTopic(topic === opt ? null : opt)}
                  />
                ))}
              </div>
            </div>

            {/* Row 3 — email + channel chips */}
            <div className={styles.row}>
              <span className={styles.text}>{splits.row3Lead}</span>
              <RevealInput
                value={email}
                onChange={(v) => { setEmail(v); if (emailError) setEmailError(false); }}
                placeholder={c.row3.emailLabel}
                ariaLabel={c.row3.emailLabel}
                name="email"
                type="email"
                error={emailError}
              />
              <div className={styles.chipGroup} role="group" aria-label="Channel">
                {c.row3.options.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={channel === opt}
                    onSelect={() => setChannel(channel === opt ? null : opt)}
                  />
                ))}
              </div>
            </div>

            {/* Row 4 — message */}
            <div className={styles.row}>
              <span className={styles.text}>{splits.row4Lead}</span>
              <RevealInput
                value={message}
                onChange={setMessage}
                placeholder={c.row4.label}
                ariaLabel={c.row4.label}
                name="message"
                grow
              />
            </div>

            <button type="submit" className={styles.submit}>
              <span className={styles.submitTextWrap}>
                <span className={styles.submitTextBase}>
                  {Array.from(c.submit).map((char, i) => (
                    <span
                      key={i}
                      className={styles.submitChar}
                      style={{ transitionDelay: `${i * 0.025}s` }}
                    >
                      {char === ' ' ? ' ' : char}
                    </span>
                  ))}
                </span>
                <span className={styles.submitTextClone} aria-hidden="true">
                  {Array.from(c.submit).map((char, i) => (
                    <span
                      key={i}
                      className={styles.submitChar}
                      style={{ transitionDelay: `${i * 0.025}s` }}
                    >
                      {char === ' ' ? ' ' : char}
                    </span>
                  ))}
                </span>
              </span>
              <span className={styles.submitArrow} aria-hidden="true">
                {/* Diagonal ↗ with two perpendicular caps — geometry matches
                    the inspiration's arrow, color uses our accent token. */}
                <svg viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1.25 17.75L17.75 1.25M17.75 1.25L17.75 17.75M17.75 1.25L1.25 1.25"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                </svg>
              </span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

interface RevealInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  name: string;
  type?: string;
  grow?: boolean;
  error?: boolean;
}

const INPUT_WIDTH_BUFFER_MIN = 12;
const INPUT_WIDTH_BUFFER_RATIO = 0.3;

function RevealInput({ value, onChange, placeholder, ariaLabel, name, type = 'text', grow = false, error = false }: RevealInputProps) {
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (grow || !mirrorRef.current) return;

    const measure = () => {
      const el = mirrorRef.current;
      if (!el) return;
      const measured = Math.ceil(el.getBoundingClientRect().width);
      const fontPx = parseFloat(getComputedStyle(el).fontSize);
      const buffer = Math.max(
        INPUT_WIDTH_BUFFER_MIN,
        Math.round(fontPx * INPUT_WIDTH_BUFFER_RATIO)
      );
      setWidth(measured + buffer);
    };

    measure();

    // Re-measure after the custom font loads — initial paint uses fallback.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      let cancelled = false;
      document.fonts.ready.then(() => { if (!cancelled) measure(); });
      return () => { cancelled = true; };
    }
  }, [value, placeholder, grow]);

  return (
    <span
      className={`${styles.inputWrap} ${styles.revealItem} ${grow ? styles.inputWrapGrow : ''} ${error ? styles.inputWrapError : ''}`}
    >
      <span ref={mirrorRef} className={styles.inputMirror} aria-hidden="true">
        {value || placeholder}
      </span>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        autoComplete="off"
        style={!grow && width ? { width: `${width}px` } : undefined}
      />
      {/* Animated underline — width drives 0%→100% during scroll reveal. */}
      <span className={styles.inputBorder} aria-hidden="true" />
    </span>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function Chip({ label, selected, onSelect }: ChipProps) {
  // Two stacked layers (base + clone), each split into per-character spans.
  // Base sits resting; clone is offset translateY(100%). On hover the base
  // slides up off-canvas and the clone slides into place, with a per-char
  // transition-delay creating a left-to-right cascade. Same pattern as the
  // submit button below and the Archive CTA.
  const chars = Array.from(label);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={`${styles.chip} ${styles.revealItem} ${selected ? styles.chipSelected : ''}`}
    >
      <span className={styles.chipTextWrap}>
        <span className={styles.chipTextBase}>
          {chars.map((ch, i) => (
            <span
              key={i}
              className={styles.chipChar}
              style={{ transitionDelay: `${i * 0.02}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
        <span className={styles.chipTextClone} aria-hidden="true">
          {chars.map((ch, i) => (
            <span
              key={i}
              className={styles.chipChar}
              style={{ transitionDelay: `${i * 0.02}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
