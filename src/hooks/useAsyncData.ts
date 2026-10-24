import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataVersion } from '../db/dataEvents';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/** Loads data and reloads automatically whenever stored data changes, so nothing goes stale. */
export function useAsyncData<T>(loader: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const version = useDataVersion();
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  });
  const latest = useRef(0);
  const loaderRef = useRef(loader);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    const id = ++latest.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading state is part of fetching
    setState((old) => ({ ...old, loading: true, error: null }));
    loaderRef
      .current()
      .then((data) => {
        if (id === latest.current) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (id === latest.current) {
          setState({ data: null, loading: false, error: e instanceof Error ? e : new Error(String(e)) });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, ...deps]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
