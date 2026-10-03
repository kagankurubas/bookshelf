// Service worker cache holding the signed-in user's Supabase REST reads
// (books, libraries, stats). vite.config.js names its runtime cache with this.
export const SUPABASE_REST_CACHE = 'supabase-rest-cache';

// Drops the cached REST reads so they don't outlive the user's session on a
// shared device. Never throws: without Cache Storage there's nothing to clear.
export async function clearUserDataCache() {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(SUPABASE_REST_CACHE);
  } catch {
    // Storage blocked or unavailable - nothing more to do.
  }
}

// localStorage key remembering whose data the REST cache holds.
export const CACHE_OWNER_KEY = 'bookshelf:rest-cache-owner';

// Clears the cache when a different user (or, after this was introduced, an
// unknown one) signs in, e.g. the previous user closed the tab without signing
// out, then records the new owner.
export async function syncUserDataCacheOwner(userId) {
  let owner = null;
  try {
    owner = localStorage.getItem(CACHE_OWNER_KEY);
  } catch {
    // Unreadable storage: treat the owner as unknown.
  }
  if (owner === userId) return;
  await clearUserDataCache();
  try {
    localStorage.setItem(CACHE_OWNER_KEY, userId);
  } catch {
    // Can't remember the owner; the cache is cleared again next time.
  }
}

// Supabase REST reads the service worker caches (NetworkFirst) so books,
// libraries and stats work offline. AI chat history is left out: its text is
// never written to Cache Storage. Built as a RegExp because workbox serializes
// urlPattern into sw.js via toString(), so it can't close over variables.
export function supabaseRestCachePattern(supabaseUrl) {
  if (!supabaseUrl) return /(?!)/;
  const base = supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${base}/rest/v1/(?!ai_(?:conversations|messages)(?:[/?]|$))`);
}
