import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBookByIsbn, searchBooks } from './openLibrary';

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
    const isbn = '9780553804577-test'; // benzersiz, diger testlerin cache'iyle çakışmasın
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

  it('returns null when the HTTP response is not ok', async () => {
    const isbn = 'not-ok-isbn-test';
    mockFetchOnce({}, false);
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
});
