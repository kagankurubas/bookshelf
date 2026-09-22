// fake-indexeddb/auto is imported ONLY in this file (not added to the
// global test setup) - keeps the scope narrow so other tests don't
// encounter a real/unneeded global indexedDB object.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { enqueueBook, getQueuedBooks, removeQueuedBook } from './offlineBookQueue';

// fake-indexeddb shares the same database name across tests, so we wipe
// the database before every test to avoid leaking data between them.
beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('bookshelf-offline-queue');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

describe('offlineBookQueue', () => {
  it('starts empty', async () => {
    const queued = await getQueuedBooks();
    expect(queued).toEqual([]);
  });

  it('enqueues a book and returns an auto-generated id', async () => {
    const id = await enqueueBook({ title: 'Dune', author: 'Frank Herbert' });
    expect(id).toBeDefined();

    const queued = await getQueuedBooks();
    expect(queued).toEqual([{ id, title: 'Dune', author: 'Frank Herbert' }]);
  });

  // Regression: App.jsx's handleSaveBook spreads bookData from BookModal's
  // state as-is - for a new (not yet saved) book this explicitly carries an
  // `id: undefined` field (hasOwnProperty true). Chromium's IndexedDB
  // implementation distinguished this from a genuinely missing `id` field
  // (where autoIncrement kicks in) and threw "not a valid key" - caught in
  // a real browser, not in jsdom.
  it('still auto-generates a key when bookFields explicitly carries an own id:undefined property', async () => {
    const bookFieldsWithExplicitUndefinedId = { id: undefined, title: 'Yeni Kitap' };
    expect(Object.prototype.hasOwnProperty.call(bookFieldsWithExplicitUndefinedId, 'id')).toBe(true);

    const id = await enqueueBook(bookFieldsWithExplicitUndefinedId);
    expect(id).toBeDefined();

    const queued = await getQueuedBooks();
    expect(queued).toEqual([{ id, title: 'Yeni Kitap' }]);
  });

  it('preserves FIFO order across multiple enqueues', async () => {
    await enqueueBook({ title: 'Kitap 1' });
    await enqueueBook({ title: 'Kitap 2' });
    await enqueueBook({ title: 'Kitap 3' });

    const queued = await getQueuedBooks();
    expect(queued.map((b) => b.title)).toEqual(['Kitap 1', 'Kitap 2', 'Kitap 3']);
  });

  it('removes only the targeted record, leaving the others (and their order) intact', async () => {
    const id1 = await enqueueBook({ title: 'Kitap 1' });
    const id2 = await enqueueBook({ title: 'Kitap 2' });
    const id3 = await enqueueBook({ title: 'Kitap 3' });

    await removeQueuedBook(id2);

    const queued = await getQueuedBooks();
    expect(queued.map((b) => b.id)).toEqual([id1, id3]);
    expect(queued.map((b) => b.title)).toEqual(['Kitap 1', 'Kitap 3']);
  });

  it('removing a non-existent id is a no-op (does not throw, does not touch existing records)', async () => {
    const id = await enqueueBook({ title: 'Kitap 1' });

    await expect(removeQueuedBook(id + 999)).resolves.toBeUndefined();

    const queued = await getQueuedBooks();
    expect(queued).toHaveLength(1);
  });
});
