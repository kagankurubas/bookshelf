import { useCallback, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

// Tracks cover URLs whose <img> failed to load, so callers can fall back to
// their placeholder. Keyed by URL, so a changed URL gets tried again; cleared
// when the connection returns, since offline failures aren't real 404s.
export function useBrokenCovers() {
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());
  useOnlineStatus(() => setBrokenUrls(new Set()));

  const isBroken = useCallback((url) => brokenUrls.has(url), [brokenUrls]);
  const markBroken = useCallback((url) => {
    setBrokenUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  return { isBroken, markBroken };
}
