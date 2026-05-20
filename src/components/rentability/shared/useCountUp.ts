// =============================================================================
// useCountUp — animation valeur 0 → target sur duration ms.
// Respecte prefers-reduced-motion (saute direct au target).
// =============================================================================

import { useEffect, useRef, useState } from "react";

interface Options {
  duration?: number;
  delay?: number;
}

export function useCountUp(target: number, { duration = 900, delay = 0 }: Options = {}): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      return;
    }
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    if (startedRef.current && target === value) return;
    startedRef.current = true;
    let startTime: number | null = null;
    const timer = window.setTimeout(() => {
      const step = (ts: number) => {
        if (startTime === null) startTime = ts;
        const t = Math.min(1, (ts - startTime) / duration);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(target * eased);
        if (t < 1) {
          rafRef.current = window.requestAnimationFrame(step);
        }
      };
      rafRef.current = window.requestAnimationFrame(step);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay]);

  return value;
}
