import { useCallback, useEffect, useState } from 'react';
import { errMsg } from './api';

/** Runs an async loader, exposing loading / error / reload state. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setLoading(true); setError('');
    loader().then(setData).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, loading, error, reload: run };
}
