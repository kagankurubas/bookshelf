// fake-indexeddb/auto is imported ONLY in this file (not added to the
// global test setup) - keeps the scope narrow so other tests don't
// encounter a real/unneeded global indexedDB object.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearQueue,
  countUnownedBooks,
  countUnsentBooks,
  MAX_REJECTED_ATTEMPTS,
  recordRejectedAttempt,
  enqueueBook,
  getQueuedBooks,
  OPEN_TIMEOUT_MS,
  removeBooksOwnedByOthers,
  removeQueuedBook,
} from './offlineBookQueue';
import { QueueUnavailableError, StorageFullError } from './saveErrors';

const DB_NAME = 'bookshelf-offline-queue';

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

// Builds the queue the way version 1 of the app left it: one store, no
// owner index, records without an owner.
function createVersionOneQueue(records) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('pendingBooks', { keyPath: 'id', autoIncrement: true });
      records.forEach((record) => store.add(record));
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function readAllRecords() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingBooks')) {
        db.close();
        resolve([]);
        return;
      }
      const getAll = db.transaction('pendingBooks', 'readonly').objectStore('pendingBooks').getAll();
      getAll.onsuccess = () => {
        db.close();
        resolve(getAll.result);
      };
      getAll.onerror = () => {
        db.close();
        reject(getAll.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

// fake-indexeddb shares the same database name across tests, so we wipe
// the database before every test to avoid leaking data between them.
beforeEach(async () => {
  await deleteDatabase();
});

describe('offlineBookQueue', () => {
  it('starts empty', async () => {
    expect(await getQueuedBooks('user-a')).toEqual([]);
  });

  it('enqueues a book under its owner and returns an auto-generated id', async () => {
    const id = await enqueueBook('user-a', { title: 'Dune', author: 'Frank Herbert' });
    expect(id).toBeDefined();

    expect(await getQueuedBooks('user-a')).toEqual([{ id, ownerId: 'user-a', title: 'Dune', author: 'Frank Herbert' }]);
  });

  it('refuses to queue a book without an owner', async () => {
    await expect(enqueueBook(undefined, { title: 'Dune' })).rejects.toThrow();
    await expect(enqueueBook(null, { title: 'Dune' })).rejects.toThrow();
    expect(await readAllRecords()).toEqual([]);
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

    const id = await enqueueBook('user-a', bookFieldsWithExplicitUndefinedId);
    expect(id).toBeDefined();

    expect(await getQueuedBooks('user-a')).toEqual([{ id, ownerId: 'user-a', title: 'Yeni Kitap' }]);
  });

  it('preserves FIFO order across multiple enqueues', async () => {
    await enqueueBook('user-a', { title: 'Kitap 1' });
    await enqueueBook('user-a', { title: 'Kitap 2' });
    await enqueueBook('user-a', { title: 'Kitap 3' });

    const queued = await getQueuedBooks('user-a');
    expect(queued.map((b) => b.title)).toEqual(['Kitap 1', 'Kitap 2', 'Kitap 3']);
  });

  it('returns only the given owner\'s records, and none without an owner', async () => {
    await enqueueBook('user-a', { title: 'A1' });
    await enqueueBook('user-b', { title: 'B1' });
    await enqueueBook('user-a', { title: 'A2' });

    expect((await getQueuedBooks('user-a')).map((b) => b.title)).toEqual(['A1', 'A2']);
    expect((await getQueuedBooks('user-b')).map((b) => b.title)).toEqual(['B1']);
    expect(await getQueuedBooks(undefined)).toEqual([]);
  });

  it('removes only the targeted record, leaving the others (and their order) intact', async () => {
    const id1 = await enqueueBook('user-a', { title: 'Kitap 1' });
    const id2 = await enqueueBook('user-a', { title: 'Kitap 2' });
    const id3 = await enqueueBook('user-a', { title: 'Kitap 3' });

    await removeQueuedBook(id2);

    const queued = await getQueuedBooks('user-a');
    expect(queued.map((b) => b.id)).toEqual([id1, id3]);
    expect(queued.map((b) => b.title)).toEqual(['Kitap 1', 'Kitap 3']);
  });

  it('removing a non-existent id is a no-op (does not throw, does not touch existing records)', async () => {
    const id = await enqueueBook('user-a', { title: 'Kitap 1' });

    await expect(removeQueuedBook(id + 999)).resolves.toBeUndefined();

    expect(await getQueuedBooks('user-a')).toHaveLength(1);
  });

  it('clearQueue removes every record, whoever owns it', async () => {
    await enqueueBook('user-a', { title: 'A1' });
    await enqueueBook('user-b', { title: 'B1' });

    await clearQueue();

    expect(await readAllRecords()).toEqual([]);
  });

  it('removeBooksOwnedByOthers drops other users\' records but keeps the user\'s own and unowned ones', async () => {
    await createVersionOneQueue([{ title: 'Eski' }]);
    await enqueueBook('user-a', { title: 'A1' });
    await enqueueBook('user-b', { title: 'B1' });

    await removeBooksOwnedByOthers('user-b');

    const remaining = await readAllRecords();
    expect(remaining.map((r) => [r.title, r.ownerId])).toEqual([['Eski', null], ['B1', 'user-b']]);
  });

  it('counts the records a sign-out would discard: the user\'s own plus unowned ones', async () => {
    await createVersionOneQueue([{ title: 'Eski' }]);
    await enqueueBook('user-a', { title: 'A1' });
    await enqueueBook('user-a', { title: 'A2' });
    await enqueueBook('user-b', { title: 'B1' });

    expect(await countUnsentBooks('user-a')).toBe(3);
    expect(await countUnsentBooks('user-b')).toBe(2);
  });

  describe('upgrading a version 1 queue', () => {
    it('marks the old records as unowned and never hands them to any user', async () => {
      await createVersionOneQueue([{ title: 'Eski 1', libraryIds: [null] }, { title: 'Eski 2', libraryIds: ['lib-x'] }]);

      expect(await getQueuedBooks('user-a')).toEqual([]);
      const records = await readAllRecords();
      expect(records.map((r) => [r.title, r.ownerId])).toEqual([['Eski 1', null], ['Eski 2', null]]);
    });

    it('keeps the queue usable after the upgrade', async () => {
      await createVersionOneQueue([{ title: 'Eski' }]);

      const id = await enqueueBook('user-a', { title: 'Yeni' });
      expect((await getQueuedBooks('user-a')).map((b) => b.id)).toEqual([id]);

      await removeQueuedBook(id);
      expect(await getQueuedBooks('user-a')).toEqual([]);
      expect((await readAllRecords()).map((r) => r.title)).toEqual(['Eski']);
    });
  });

  describe('while another tab still has the old version open', () => {
    // Plays the old tab: a version 1 connection that, like the version 1
    // code, does not close itself when asked to upgrade.
    function openOldTabConnection() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    it('gives up waiting instead of hanging, then works once the old tab lets go', async () => {
      await createVersionOneQueue([{ title: 'Eski' }]);
      const oldTab = await openOldTabConnection();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const pending = getQueuedBooks('user-a').then(() => 'opened', (err) => err);
        await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS);

        const outcome = await pending;
        expect(outcome).toBeInstanceOf(QueueUnavailableError);
      } finally {
        vi.useRealTimers();
      }

      oldTab.close();

      const id = await enqueueBook('user-a', { title: 'Yeni' });
      expect((await getQueuedBooks('user-a')).map((b) => b.id)).toEqual([id]);
      expect((await readAllRecords()).map((r) => [r.title, r.ownerId])).toEqual([['Eski', null], ['Yeni', 'user-a']]);
    });

    it('does not wait at all when the old tab closes on request', async () => {
      await createVersionOneQueue([{ title: 'Eski' }]);
      const oldTab = await openOldTabConnection();
      oldTab.onversionchange = () => oldTab.close();

      expect(await getQueuedBooks('user-a')).toEqual([]);
      expect((await readAllRecords()).map((r) => r.ownerId)).toEqual([null]);
    });
  });

  describe('rejected send attempts', () => {
    it('counts each refusal with its code and time, and marks the record failed on the last one', async () => {
      const id = await enqueueBook('user-a', { title: 'Reddedilen' });

      await recordRejectedAttempt(id, '42501');
      let [record] = await getQueuedBooks('user-a');
      expect(record).toMatchObject({ attempts: 1, lastErrorCode: '42501', failed: false });
      expect(Number.isNaN(Date.parse(record.lastAttemptAt))).toBe(false);

      await recordRejectedAttempt(id, '23514');
      await recordRejectedAttempt(id, '23514');
      [record] = await getQueuedBooks('user-a');
      expect(MAX_REJECTED_ATTEMPTS).toBe(3);
      expect(record).toMatchObject({ title: 'Reddedilen', attempts: 3, lastErrorCode: '23514', failed: true });
    });

    it('keeps the count and the failed mark across a reload', async () => {
      const id = await enqueueBook('user-a', { title: 'Kalıcı' });
      await recordRejectedAttempt(id, '42501');
      await recordRejectedAttempt(id, '42501');

      vi.resetModules();
      const reloaded = await import('./offlineBookQueue');
      let [record] = await reloaded.getQueuedBooks('user-a');
      expect(record).toMatchObject({ attempts: 2, failed: false });

      await reloaded.recordRejectedAttempt(id, '42501');
      vi.resetModules();
      const reloadedAgain = await import('./offlineBookQueue');
      [record] = await reloadedAgain.getQueuedBooks('user-a');
      expect(record).toMatchObject({ attempts: 3, failed: true, title: 'Kalıcı' });
    });

    it('ignores a record that is already gone', async () => {
      await expect(recordRejectedAttempt(12345, '42501')).resolves.toBeUndefined();
      expect(await readAllRecords()).toEqual([]);
    });
  });

  it('counts the unowned records left from before owners were stored', async () => {
    await createVersionOneQueue([{ title: 'Eski 1' }, { title: 'Eski 2' }]);
    await enqueueBook('user-a', { title: 'A1' });

    expect(await countUnownedBooks()).toBe(2);
  });

  describe('IndexedDB failures', () => {
    it('reports a full device as StorageFullError, not as a refusal or a network error', async () => {
      const add = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });
      try {
        const outcome = await enqueueBook('user-a', { title: 'Dolu' }).catch((err) => err);
        expect(outcome).toBeInstanceOf(StorageFullError);
        expect(outcome.cause.name).toBe('QuotaExceededError');
      } finally {
        add.mockRestore();
      }
    });

    it('reports an aborted transaction as QueueUnavailableError, not as an AbortError', async () => {
      const realAdd = IDBObjectStore.prototype.add;
      const add = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function abortAfterAdd(...args) {
        const request = realAdd.apply(this, args);
        this.transaction.abort();
        return request;
      });
      try {
        const outcome = await enqueueBook('user-a', { title: 'İptal' }).catch((err) => err);
        expect(outcome).toBeInstanceOf(QueueUnavailableError);
        expect(outcome.name).not.toBe('AbortError');
      } finally {
        add.mockRestore();
      }
      expect(await readAllRecords()).toEqual([]);
    });

    it('reports a newer queue version open elsewhere as QueueUnavailableError', async () => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 9);
        request.onupgradeneeded = () => request.result.createObjectStore('pendingBooks', { keyPath: 'id', autoIncrement: true });
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

      const outcome = await getQueuedBooks('user-a').catch((err) => err);
      expect(outcome).toBeInstanceOf(QueueUnavailableError);
      expect(outcome.cause.name).toBe('VersionError');
    });
  });
});
