const isbnCache = new Map();
const searchCache = new Map();

function normalizeBookData(isbn, data) {
  if (!data) return null;

  const authors = Array.isArray(data.authors) ? data.authors.map((a) => a.name).filter(Boolean) : [];
  const publishers = Array.isArray(data.publishers) ? data.publishers.map((p) => p.name).filter(Boolean) : [];

  return {
    title: data.title || '',
    author: authors.join(', ') || '',
    publisher: publishers.join(', ') || '',
    coverImage: data.cover?.large || data.cover?.medium || data.cover?.small || null,
    isbn,
    pageCount: data.number_of_pages || null,
  };
}

export async function getBookByIsbn(isbn) {
  if (!isbn) return null;
  const key = String(isbn).trim();
  if (!key) return null;

  if (isbnCache.has(key)) {
    return isbnCache.get(key);
  }

  const bibkey = `ISBN:${key}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkey)}&format=json&jscmd=data`;

  // Network errors/timeouts and HTTP error codes (below) are deliberately
  // NOT swallowed, they're rethrown - so the caller can tell this apart
  // from "not found" (a successful response with no data). A failed result
  // is not cached, so a retry actually issues a new request.
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error('OpenLibrary getBookByIsbn: istek başarısız oldu', err);
    throw err;
  }

  if (!response.ok) {
    console.error(`OpenLibrary getBookByIsbn: HTTP ${response.status}`);
    throw new Error(`OpenLibrary getBookByIsbn: HTTP ${response.status}`);
  }

  const data = await response.json();
  const bookData = data[bibkey];
  const normalized = normalizeBookData(key, bookData);

  isbnCache.set(key, normalized);
  return normalized;
}

function normalizeSearchDoc(doc) {
  return {
    title: doc.title || '',
    author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '',
    coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : null,
    firstPublishYear: doc.first_publish_year || null,
    pageCount: doc.number_of_pages_median || null,
  };
}

export async function searchBooks(query) {
  const key = String(query || '').trim();
  if (!key) return [];

  if (searchCache.has(key)) {
    return searchCache.get(key);
  }

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(key)}&limit=15`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error('OpenLibrary searchBooks: istek başarısız oldu', err);
    throw err;
  }

  if (!response.ok) {
    console.error(`OpenLibrary searchBooks: HTTP ${response.status}`);
    throw new Error(`OpenLibrary searchBooks: HTTP ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.docs) ? data.docs.map(normalizeSearchDoc) : [];

  searchCache.set(key, results);
  return results;
}

const OPEN_LIBRARY_COVER_PATH = /^\/b\/(id|isbn|olid)\/(.+)-[SML]\.jpg$/i;

function parseOpenLibraryCoverUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const match = parsed.hostname === 'covers.openlibrary.org' && parsed.pathname.match(OPEN_LIBRARY_COVER_PATH);
  return match ? { parsed, type: match[1], key: match[2] } : null;
}

// Rewrites an Open Library cover URL to the given size variant (S/M/L; omit to
// keep the stored size) and adds default=false so a missing cover 404s instead
// of returning a 1x1 blank. Any other URL is returned unchanged.
export function openLibraryCoverUrl(url, size) {
  const cover = parseOpenLibraryCoverUrl(url);
  if (!cover) return url;

  const { parsed, type, key } = cover;
  if (size) {
    parsed.pathname = `/b/${type}/${key}-${size}.jpg`;
  }
  parsed.searchParams.set('default', 'false');
  return parsed.toString();
}

// src/srcSet for a ~40px cover thumbnail: S at 1x, M on high-DPI screens.
export function coverThumbnailProps(url) {
  if (!parseOpenLibraryCoverUrl(url)) return { src: url };
  const small = openLibraryCoverUrl(url, 'S');
  return { src: small, srcSet: `${small} 1x, ${openLibraryCoverUrl(url, 'M')} 2x` };
}
