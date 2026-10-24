import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

/** Call after any write so screens refresh and never show stale data. */
export function notifyDataChanged(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useDataVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}
