import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useCachedQuery<T>(key: string, load: () => Promise<T>) {
  const loadRef = useRef(load);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<T | undefined>(undefined);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(() => {
    setRequest((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRefreshing(true);
      try {
        const next = await loadRef.current();
        if (cancelled) return;
        setData(next);
        setStatus('ready');
        setFromCache(false);
        setError(null);
        await AsyncStorage.setItem(`stamply.cache.${key}`, JSON.stringify(next));
      } catch (err) {
        const cached = await AsyncStorage.getItem(`stamply.cache.${key}`);
        if (cancelled) return;
        if (cached) {
          setData(JSON.parse(cached) as T);
          setFromCache(true);
          setStatus('ready');
          setError(null);
        } else {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [key, request]);

  return { status, data, fromCache, error, reload, refreshing };
}
