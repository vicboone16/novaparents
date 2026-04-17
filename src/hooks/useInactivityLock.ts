import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS = 30 * 60 * 1_000;
const EVENTS = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'scroll'] as const;

export function useInactivityLock() {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLocked(true), IDLE_MS);
  }, []);

  useEffect(() => {
    reset();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset]);

  const unlock = useCallback(() => {
    setLocked(false);
    reset();
  }, [reset]);

  return { locked, unlock };
}
