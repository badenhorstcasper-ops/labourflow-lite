import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Auto-refreshing data hook for admin/owner pages.
 * - Runs on mount
 * - Re-runs every `intervalMs` (default 30s)
 * - Re-runs when tab becomes visible again
 * - Re-runs when browser regains network
 */
export function useLiveData<T>(
  loader: () => Promise<T>,
  intervalMs: number = 30_000,
  /** When false, the loader is not run at all (e.g. still checking sign-in). */
  enabled: boolean = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      setData(result);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    run();
    const iv = setInterval(run, intervalMs);
    const onVis = () => { if (document.visibilityState === "visible") run(); };
    const onOnline = () => run();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [run, intervalMs]);

  return { data, error, refreshing, updatedAt, refresh: run };
}

export function formatRelative(d: Date | null): string {
  if (!d) return "never";
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}
