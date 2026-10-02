// Covers embedded in an exported image must already be data URLs: if
// html-to-image has to fetch a cover itself and that fails, the whole export
// fails. Each URL is fetched once per session; the result (data URL, or null
// when the cover can't be read) is reused.
const results = new Map();

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
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await blobToDataUrl(blob);
  } catch {
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
