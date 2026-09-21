// fake-indexeddb/auto SADECE bu dosyada import ediliyor (global test setup'a
// eklenmiyor) - kapsam dar tutulup diger testlerin gercek/gerekmeyen bir
// indexedDB kuresel nesnesiyle karsilasmasi engelleniyor.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { enqueueBook, getQueuedBooks, removeQueuedBook } from './offlineBookQueue';

// fake-indexeddb, testler arasinda ayni veritabani adini paylasip veri
// sizdirmasin diye her testten once veritabanini tamamen siliyoruz.
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

  // Regresyon: App.jsx'teki handleSaveBook, BookModal'in state'inden gelen
  // bookData'yi oldugu gibi spread'liyor - yeni (henuz kaydedilmemis) bir
  // kitap icin bu, `id: undefined` alanini ACIKCA (hasOwnProperty true)
  // tasiyor. Chromium'un IndexedDB implementasyonu bunu, gercekten eksik
  // bir `id` alanindan (autoIncrement'in devreye girdigi durum) ayirt edip
  // "not a valid key" hatasi firlatiyordu - gercek tarayicida (jsdom'da
  // degil) yakalandi.
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
