import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coverThumbnailProps, getBookByIsbn, openLibraryCoverUrl, searchBooks } from './openLibrary';

function mockFetchOnce(body, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  });
}

describe('getBookByIsbn', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null without calling fetch when isbn is empty', async () => {
    global.fetch = vi.fn();
    const result = await getBookByIsbn('');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps a successful Open Library response to the app book shape', async () => {
    const isbn = '9780553804577-test'; // unique, avoids clashing with other tests' cache
    mockFetchOnce({
      [`ISBN:${isbn}`]: {
        title: 'Dune',
        authors: [{ name: 'Frank Herbert' }],
        publishers: [{ name: 'Ace Books' }],
        cover: { large: 'https://example.com/cover.jpg' },
        number_of_pages: 412,
      },
    });

    const result = await getBookByIsbn(isbn);

    expect(result).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      publisher: 'Ace Books',
      coverImage: 'https://example.com/cover.jpg',
      isbn,
      pageCount: 412,
    });
  });

  it('throws when the HTTP response is not ok (a failed request, not a missing book)', async () => {
    const isbn = 'not-ok-isbn-test';
    mockFetchOnce({}, false);
    await expect(getBookByIsbn(isbn)).rejects.toThrow();
  });

  it('throws when fetch itself rejects (network error/timeout)', async () => {
    const isbn = 'network-fail-isbn-test';
    global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));
    await expect(getBookByIsbn(isbn)).rejects.toThrow('network fail');
  });

  it('still returns null (not a throw) when Open Library genuinely has no data for the ISBN', async () => {
    const isbn = 'genuinely-missing-isbn-test';
    mockFetchOnce({}); // successful response but no data for this bibkey
    const result = await getBookByIsbn(isbn);
    expect(result).toBeNull();
  });

  it('caches results so a repeated lookup does not call fetch again', async () => {
    const isbn = 'cache-test-isbn';
    mockFetchOnce({
      [`ISBN:${isbn}`]: { title: 'Cached Book', authors: [], publishers: [] },
    });

    await getBookByIsbn(isbn);
    await getBookByIsbn(isbn);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed request, so a retry actually calls fetch again', async () => {
    const isbn = 'no-cache-on-error-isbn-test';
    global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));

    await expect(getBookByIsbn(isbn)).rejects.toThrow();
    await expect(getBookByIsbn(isbn)).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('searchBooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty array without calling fetch for an empty query', async () => {
    global.fetch = vi.fn();
    const result = await searchBooks('   ');
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps Open Library search docs to the app result shape', async () => {
    mockFetchOnce({
      docs: [
        {
          title: 'Foundation',
          author_name: ['Isaac Asimov'],
          cover_i: 12345,
          isbn: ['9780553293357'],
          first_publish_year: 1951,
          number_of_pages_median: 255,
        },
      ],
    });

    const results = await searchBooks('foundation');

    expect(results).toEqual([
      {
        title: 'Foundation',
        author: 'Isaac Asimov',
        coverImage: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
        isbn: '9780553293357',
        firstPublishYear: 1951,
        pageCount: 255,
      },
    ]);
  });

  it('still returns an empty array (not a throw) when the search genuinely has no results', async () => {
    mockFetchOnce({ docs: [] });
    const results = await searchBooks('a query with genuinely no matches');
    expect(results).toEqual([]);
  });

  it('throws when the HTTP response is not ok (a failed request, not zero results)', async () => {
    mockFetchOnce({}, false);
    await expect(searchBooks('http-not-ok-query')).rejects.toThrow();
  });

  it('throws when fetch itself rejects (network error/timeout)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));
    await expect(searchBooks('network-fail-query')).rejects.toThrow('network fail');
  });

  it('does not cache a failed request, so a retry actually calls fetch again', async () => {
    const query = 'no-cache-on-error-query';
    global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));

    await expect(searchBooks(query)).rejects.toThrow();
    await expect(searchBooks(query)).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('openLibraryCoverUrl', () => {
  it('rewrites an Open Library cover to the requested size and adds default=false', () => {
    expect(openLibraryCoverUrl('https://covers.openlibrary.org/b/id/12345-L.jpg', 'S'))
      .toBe('https://covers.openlibrary.org/b/id/12345-S.jpg?default=false');
  });

  it('rewrites isbn-keyed covers too', () => {
    expect(openLibraryCoverUrl('https://covers.openlibrary.org/b/isbn/9780553293357-L.jpg', 'M'))
      .toBe('https://covers.openlibrary.org/b/isbn/9780553293357-M.jpg?default=false');
  });

  it('keeps the stored size when no size is given', () => {
    expect(openLibraryCoverUrl('https://covers.openlibrary.org/b/isbn/9780553293357-L.jpg'))
      .toBe('https://covers.openlibrary.org/b/isbn/9780553293357-L.jpg?default=false');
  });

  it('preserves an existing query string', () => {
    expect(openLibraryCoverUrl('https://covers.openlibrary.org/b/olid/OL7353617M-M.jpg?foo=1', 'S'))
      .toBe('https://covers.openlibrary.org/b/olid/OL7353617M-S.jpg?foo=1&default=false');
  });

  it('returns non-Open Library, invalid and empty URLs unchanged', () => {
    expect(openLibraryCoverUrl('https://example.com/cover-L.jpg', 'S')).toBe('https://example.com/cover-L.jpg');
    expect(openLibraryCoverUrl('not a url', 'S')).toBe('not a url');
    expect(openLibraryCoverUrl('', 'S')).toBe('');
    expect(openLibraryCoverUrl(null, 'S')).toBe(null);
  });
});

describe('coverThumbnailProps', () => {
  it('uses S at 1x and M at 2x for Open Library covers', () => {
    expect(coverThumbnailProps('https://covers.openlibrary.org/b/id/12345-L.jpg')).toEqual({
      src: 'https://covers.openlibrary.org/b/id/12345-S.jpg?default=false',
      srcSet: 'https://covers.openlibrary.org/b/id/12345-S.jpg?default=false 1x, https://covers.openlibrary.org/b/id/12345-M.jpg?default=false 2x',
    });
  });

  it('passes other URLs through without a srcSet', () => {
    expect(coverThumbnailProps('https://example.com/cover.jpg')).toEqual({ src: 'https://example.com/cover.jpg' });
  });
});
