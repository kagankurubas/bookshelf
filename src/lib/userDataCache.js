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
