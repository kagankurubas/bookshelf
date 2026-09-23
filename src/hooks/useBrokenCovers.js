import { useCallback, useState } from 'react';

// Tracks cover URLs whose <img> failed to load, so callers can fall back to
// their placeholder. Keyed by URL, so a changed URL gets tried again.
export function useBrokenCovers() {
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());

  const isBroken = useCallback((url) => brokenUrls.has(url), [brokenUrls]);
  const markBroken = useCallback((url) => {
    setBrokenUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  return { isBroken, markBroken };
}
