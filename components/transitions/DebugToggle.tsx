'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  readEffectOverride,
  resolveDefaultEffect,
  writeEffectOverride,
} from './TransitionProvider';
import {
  TRANSITION_EFFECT_NAMES,
  type TransitionEffectName,
} from './registry';
import styles from './DebugToggle.module.css';

const OVERRIDE_EVENT = 'transition-effect-override-changed';

const subscribe = (cb: () => void): (() => void) => {
  window.addEventListener(OVERRIDE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(OVERRIDE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

const getSnapshot = (): TransitionEffectName | null => readEffectOverride();

/**
 * Dev-only floating pill to cycle the active transition effect.
 *
 * Mounted via `next/dynamic({ ssr: false })` in `app/layout.tsx`, so this
 * component never runs on the server — no SSR snapshot and no hydration
 * mismatch risk (previously, returning `null` on SSR and the button on the
 * client caused React to remount the tree and reset `TransitionProvider`'s
 * state mid-transition).
 *
 * Persists the choice in `localStorage.transition-effect-override` (read by
 * `TransitionProvider.triggerTransition`). To remove later: delete this
 * file, its CSS, the dynamic import + mount in `app/layout.tsx`, and the
 * three exported helpers in `TransitionProvider.tsx`.
 */
export function TransitionDebugToggle() {
  const override = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const cycle = useCallback(() => {
    const names = TRANSITION_EFFECT_NAMES;
    if (names.length === 0) return;
    const current = readEffectOverride() ?? resolveDefaultEffect();
    const i = names.indexOf(current);
    const next = names[(i + 1) % names.length];
    writeEffectOverride(next);
    window.dispatchEvent(new Event(OVERRIDE_EVENT));
  }, []);

  const active = override ?? resolveDefaultEffect();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={cycle}
      aria-label={`Cycle page transition effect. Currently ${active}.`}
    >
      <span className={styles.dot} />
      <span className={styles.label}>FX</span>
      <span className={styles.value}>{active}</span>
    </button>
  );
}
