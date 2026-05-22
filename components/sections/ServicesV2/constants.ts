import { getServicesFaces } from '@/data';
import type { ServiceFace } from '@/data';

/* Each service face maps 1:1 to a zone on the tuning dial. The v3 mockup
   carried its own ZONES[] hardcoded inline; we derive directly from
   `content.services.faces` so the two Services variants stay in lockstep. */
export const ZONES: ReadonlyArray<ServiceFace> = getServicesFaces();

/* Width of one tool cell on the dial strip, in CSS pixels. Doubles as the
   notch spacing. Mirrors the GAP constant in services-stack-drum-dial-v3.html.
   Kept as a JS constant (not a CSS var) because applyDial() multiplies it by
   a fractional cell index to position the strip; a single source of truth
   avoids drift between layout and the scroll-driven translateX. */
export const GAP_PX = 220;

/* Padding cells at each end of the dial strip so the first and last real
   tools can pass the centred needle without the strip running out of runway.
   Three is enough for the natural eased ease-in/ease-out at the boundaries. */
export const PAD_CELLS = 3;

/* Pin runway, in viewport heights. The mockup uses 10 — long enough that a
   1vh wheel burst pans ~0.36 cells, so no individual gesture skips a zone.
   See the inline comment at the bottom of services-stack-drum-dial-v3.html
   for the math; reproduced here so future tuning has the rationale. */
export const PIN_RUNWAY_VH = 10;

/* ScrollTrigger `scrub` value. With the longer pin runway above, a sharper
   scroll has more travel headroom, so lerp the dial toward its target a bit
   more lazily. Controls *response*, not distance. */
export const PIN_SCRUB = 1.0;

/* Per-letter portal stagger durations for the bigword OUT/IN swap. Matches
   the Hero portal animation vocabulary (see HeroText.tsx) so the two
   sections feel like one motion system. */
export const BW_OUT_DUR = 0.28;
export const BW_OUT_STAGGER = 0.022;
export const BW_IN_DUR = 0.45;
export const BW_IN_STAGGER = 0.04;

/* Word-mask reveal vocabulary for the lede swap. Matches the case-study
   Hero lede in components/sections/case-study/Hero (yPercent 110→0, power2.out,
   0.12s/line). The OUT phase is intentionally faster than IN so the new
   lede has clear runway. */
export const LEDE_IN_DUR = 0.7;
export const LEDE_IN_LINE_STAGGER = 0.12;
export const LEDE_OUT_DUR = 0.35;
export const LEDE_OUT_LINE_STAGGER = 0.06;

/* OUT→SWAP overlap. The swap to the new zone's content fires this many
   seconds before the slower of the two OUT animations finishes, so the IN
   begins slightly before the OUT clears. Gives a continuous motion feel
   rather than a hard cut. */
export const SWAP_OVERLAP = 0.08;

/* DOM ID — stable so the SR-only landmark can target the same node across
   re-renders. Suffixed with `-v2` to avoid collision with the existing
   Services section, which owns the unsuffixed ID. */
export const HEADING_ID = 'services-v2-heading';

/* Pads a zero-padded zone index for major notch labels: 1 → "01". */
export const formatZoneIndex = (i: number): string =>
  String(i + 1).padStart(2, '0');

/* Short rail label used on the zone footer cells. Falls back to `word`
   stripped of trailing punctuation when `rail` is empty. */
export const zoneRail = (z: ServiceFace): string =>
  z.rail || z.word.replace(/\.$/, '');
