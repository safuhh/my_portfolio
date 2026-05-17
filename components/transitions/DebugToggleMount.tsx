'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side mount for `TransitionDebugToggle`.
 *
 * `next/dynamic({ ssr: false })` cannot be called from a server component
 * (Next.js App Router restriction), so we hop into a client component here
 * to defer the toggle to the browser. The toggle itself reads
 * `localStorage`, which would otherwise produce a hydration mismatch — see
 * the comment in `DebugToggle.tsx` for the failure mode this prevents.
 */
const TransitionDebugToggle = dynamic(
  () => import('./DebugToggle').then((m) => ({ default: m.TransitionDebugToggle })),
  { ssr: false }
);

export function TransitionDebugToggleMount() {
  if (process.env.NODE_ENV === 'production') return null;
  return <TransitionDebugToggle />;
}
