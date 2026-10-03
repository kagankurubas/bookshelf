import { resizeImageBlob } from './imageResize';

// Covers embedded in an exported image must already be data URLs: if
// html-to-image has to fetch a cover itself and that fails, the whole export
// fails. Each URL is fetched and shrunk once per session; the result (data
// URL, or null when the cover can't be read) is reused, except after a
// timeout, so a cover that only stalled is tried again next time.
const results = new Map();

// A stalled request (slow redirect chain, captive portal) would otherwise keep
// the card in "preparing" and Share disabled indefinitely.
export const COVER_FETCH_TIMEOUT_MS = 15000;

// A calendar cell is at most ~70px wide in the 2x export, so 200px keeps
// covers sharp while keeping the card's data URLs small.
const COVER_MAX_WIDTH = 200;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(url) {
  try {
    // A plain CORS fetch: it carries the page's Origin header, which the
    // service worker's cached covers are keyed on (Vary: Origin).
    const response = await fetch(url, { signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await blobToDataUrl(await resizeImageBlob(blob, COVER_MAX_WIDTH));
  } catch (err) {
    if (err?.name === 'TimeoutError') results.delete(url);
    return null;
  }
}

export function loadCoverDataUrl(url) {
  if (!results.has(url)) results.set(url, fetchAsDataUrl(url));
  return results.get(url);
}

export function clearCoverDataUrlCache() {
  results.clear();
}
