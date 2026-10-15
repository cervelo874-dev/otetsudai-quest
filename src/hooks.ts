import { useEffect, useState, useSyncExternalStore } from 'react';
import { createTicker } from './ticker';
import { pipTimer } from './pip';

/** 定期的に現在時刻を返す（Worker駆動・enabledで休止可能） */
export function useNow(ms = 1000, enabled = true): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const stop = createTicker(() => setNow(Date.now()), ms);
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [ms, enabled]);
  return now;
}

export function usePipActive(): boolean {
  return useSyncExternalStore(
    (l) => pipTimer.subscribe(l),
    () => pipTimer.active,
    () => false,
  );
}
