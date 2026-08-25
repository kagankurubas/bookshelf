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

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`OpenLibrary getBookByIsbn: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const bookData = data[bibkey];
    const normalized = normalizeBookData(key, bookData);

    isbnCache.set(key, normalized);
    return normalized;
  } catch (err) {
    console.error('OpenLibrary getBookByIsbn: istek başarısız oldu', err);
    return null;
  }
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

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`OpenLibrary searchBooks: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = Array.isArray(data.docs) ? data.docs.map(normalizeSearchDoc) : [];

    searchCache.set(key, results);
    return results;
  } catch (err) {
    console.error('OpenLibrary searchBooks: istek başarısız oldu', err);
    return [];
  }
}
