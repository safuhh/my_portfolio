'use client';

import { useEffect, useRef, useCallback, createContext, useContext, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';

// Snapshot GSAP's lagSmoothing threshold ONCE per page lifetime so that under
// React 18 StrictMode dev (mount→unmount→remount) the second mount doesn't
// capture the already-zeroed value and restore `0` on final unmount. Module
// scope is the only place where StrictMode can't double-run us.
let originalLagSmoothing: number | null = null;
function snapshotLagSmoothing(): number {
  if (originalLagSmoothing === null && typeof window !== 'undefined') {
    originalLagSmoothing = (
      gsap.ticker.lagSmoothing as unknown as () => number
    )();
  }
  return originalLagSmoothing ?? 33;
}

// ============================================
// LENIS CONTEXT - Allows child components to scroll programmatically
// ============================================
interface LenisContextValue {
  scrollTo: (target: string | number | HTMLElement, options?: { offset?: number; duration?: number }) => void;
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
});

export const useLenis = () => useContext(LenisContext);

// ============================================
// PROVIDER
// ============================================
interface LenisProviderProps {
  children: ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const firstRouteRef = useRef(true);

  useEffect(() => {
    // Initialize Lenis
    // duration: tuned to 1.2 (Lenis docs default) for 60Hz responsiveness.
    // Original 3.0 produced ~5s of trailing lerp when combined with Hero's
    // ScrollTrigger scrub — see docs/perf/animation-baseline.md to restore.
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;

    // Sync Lenis scroll with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // PERF: Drive Lenis from gsap.ticker so all RAF-driven animations
    // (Lenis, CustomCursor, GSAP tweens) share a single frame loop.
    // gsap.ticker passes time in seconds; lenis.raf expects ms.
    const tick = (time: number) => {
      if (!document.hidden) {
        lenis.raf(time * 1000);
      }
    };
    const prevLagSmoothing = snapshotLagSmoothing();
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // Required by Lenis to keep scroll timing accurate

    // PERF: Handle visibility change - sync when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && lenisRef.current) {
        // Sync scroll state when tab regains focus
        lenisRef.current.raf(performance.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(prevLagSmoothing);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Defensive: some lenis versions don't release scroll emitter
      // subscribers on destroy(), leaking ScrollTrigger.update references.
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Reset scroll + ScrollTrigger world on client-side route changes.
  // Cold load is handled by the inline scrollTo(0,0) in layout.tsx, so the
  // very first run of this effect must be a no-op — otherwise Lenis fights
  // the inline reset and ScrollTrigger.refresh() runs before any page-level
  // triggers exist.
  useEffect(() => {
    if (firstRouteRef.current) {
      firstRouteRef.current = false;
      return;
    }
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
    ScrollTrigger.refresh();
    ScrollTrigger.update();
  }, [pathname]);

  const scrollTo = useCallback((target: string | number | HTMLElement, options?: { offset?: number; duration?: number }) => {
    lenisRef.current?.scrollTo(target, options);
  }, []);

  const contextValue = useMemo<LenisContextValue>(() => ({
    scrollTo,
  }), [scrollTo]);

  return (
    <LenisContext.Provider value={contextValue}>
      {children}
    </LenisContext.Provider>
  );
}
