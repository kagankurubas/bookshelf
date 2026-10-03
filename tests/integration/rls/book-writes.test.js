import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRlsFixture, insertOwnRow } from './fixtures.js';
import { deleteBookRow, insertBookWithLinks } from '../../../src/lib/bookWrites.js';
import { NoLibraryError } from '../../../src/lib/saveErrors.js';

// Runs the app's own book write path against the real RLS policies: a failed
// library link must not leave an orphan book, and the clean-up delete goes
// through the same path as deleting a book from the UI.
describe('RLS: book writes leave no orphan books', () => {
  let fixture;
  let libraryA;
  let libraryB;

  const uniqueTitle = (label) => `book-writes-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function booksTitled(client, title) {
    const { data, error } = await client.from('books').select('id, book_libraries ( library_id )').eq('title', title);
    expect(error).toBeNull();
    return data;
  }

  beforeAll(async () => {
    fixture = await setupRlsFixture();
    const [insertedA, insertedB] = await Promise.all([
      insertOwnRow(fixture.userA, 'libraries', { name: 'A Kitapligi', is_default: true }),
      insertOwnRow(fixture.userB, 'libraries', { name: 'B Kitapligi', is_default: true }),
    ]);
    expect(insertedA.error).toBeNull();
    expect(insertedB.error).toBeNull();
    libraryA = insertedA.data;
    libraryB = insertedB.data;
  });

  afterAll(async () => {
    await fixture?.cleanup();
  });

  it('saves a book linked to the user\'s own library', async () => {
    const { userA } = fixture;
    const title = uniqueTitle('ok');

    const { row, libraryIds } = await insertBookWithLinks(userA.client, userA.id, {
      title, author: 'Yazar', libraryIds: [libraryA.id], notesList: [{ text: 'ilk not' }],
    });

    expect(libraryIds).toEqual([libraryA.id]);
    const saved = await booksTitled(userA.client, title);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(row.id);
    expect(saved[0].book_libraries).toEqual([{ library_id: libraryA.id }]);
  });

  it('deletes the book again when RLS refuses the library link', async () => {
    const { userA } = fixture;
    const title = uniqueTitle('refused-link');

    const caught = await insertBookWithLinks(userA.client, userA.id, {
      title, author: 'Yazar', libraryIds: [libraryB.id],
    }).catch((err) => err);

    expect(caught.code).toBe('42501');
    expect(await booksTitled(userA.client, title)).toEqual([]);
  });

  it('writes nothing at all when the book has no library', async () => {
    const { userA } = fixture;
    const title = uniqueTitle('no-library');

    const caught = await insertBookWithLinks(userA.client, userA.id, {
      title, author: 'Yazar', libraryIds: [],
    }).catch((err) => err);

    expect(caught).toBeInstanceOf(NoLibraryError);
    expect(await booksTitled(userA.client, title)).toEqual([]);
  });

  it('lets a user delete their own book through the same path, but not someone else\'s', async () => {
    const { userA, userB } = fixture;
    const titleA = uniqueTitle('delete-own');
    const titleOther = uniqueTitle('delete-other');

    const { row: ownBook } = await insertBookWithLinks(userA.client, userA.id, {
      title: titleA, author: 'Yazar', libraryIds: [libraryA.id],
    });
    const { row: otherBook } = await insertBookWithLinks(userA.client, userA.id, {
      title: titleOther, author: 'Yazar', libraryIds: [libraryA.id],
    });

    expect(await deleteBookRow(userA.client, ownBook.id)).toBe(1);
    expect(await booksTitled(userA.client, titleA)).toEqual([]);

    // RLS turns this into a zero-row delete, not an error: the count the
    // clean-up check relies on.
    expect(await deleteBookRow(userB.client, otherBook.id)).toBe(0);
    expect(await booksTitled(userA.client, titleOther)).toHaveLength(1);
  });

  it('reports zero deleted rows for a book that is already gone', async () => {
    const { userA } = fixture;
    const { row } = await insertBookWithLinks(userA.client, userA.id, {
      title: uniqueTitle('already-gone'), author: 'Yazar', libraryIds: [libraryA.id],
    });

    expect(await deleteBookRow(userA.client, row.id)).toBe(1);
    expect(await deleteBookRow(userA.client, row.id)).toBe(0);
  });
});
