// Send attempts against the real IndexedDB queue (fake-indexeddb): which
// failures count against a record, when it is marked failed, and that
// waiting records keep going once the problem is gone.
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineBookQueue } from './useOfflineBookQueue';
import { enqueueBook, getQueuedBooks } from '../lib/offlineBookQueue';

const libraries = [{ id: 'lib-1', isDefault: true }];
const rlsRefusal = { code: '42501', message: 'new row violates row-level security policy' };
const expiredJwt = { code: 'PGRST301', message: 'JWT expired' };

beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('bookshelf-offline-queue');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSync(addBookForSync) {
  return renderHook(() => useOfflineBookQueue({
    userId: 'user-a', libraries, addBook: vi.fn(), addBookForSync, refreshStats: vi.fn(), isReady: true,
  }));
}

async function syncAgain() {
  await act(async () => {
    window.dispatchEvent(new Event('online'));
  });
}

async function recordTitled(title) {
  return (await getQueuedBooks('user-a')).find((record) => record.title === title);
}

describe('offline queue send attempts', () => {
  it('counts a refusal against that record only and moves on to the next one', async () => {
    await enqueueBook('user-a', { title: 'Reddedilen', libraryIds: ['lib-1'] });
    await enqueueBook('user-a', { title: 'Sonraki', libraryIds: ['lib-1'] });
    const addBookForSync = vi.fn(async (fields) => {
      if (fields.title === 'Reddedilen') throw rlsRefusal;
      return { id: 'saved' };
    });

    renderSync(addBookForSync);

    await waitFor(async () => expect(await recordTitled('Sonraki')).toBeUndefined());
    expect(await recordTitled('Reddedilen')).toMatchObject({ attempts: 1, lastErrorCode: '42501', failed: false });
  });

  it('marks a record failed on the third refusal, keeps it, and stops sending it', async () => {
    await enqueueBook('user-a', { title: 'Reddedilen', libraryIds: ['lib-1'] });
    const addBookForSync = vi.fn().mockRejectedValue(rlsRefusal);
    const { result } = renderSync(addBookForSync);

    await waitFor(async () => expect((await recordTitled('Reddedilen')).attempts).toBe(1));
    await syncAgain();
    await waitFor(async () => expect((await recordTitled('Reddedilen')).attempts).toBe(2));
    await syncAgain();
    await waitFor(async () => expect(await recordTitled('Reddedilen')).toMatchObject({ attempts: 3, failed: true }));
    await waitFor(() => expect(result.current.failedCount).toBe(1));
    expect(result.current.queuedCount).toBe(0);

    await syncAgain();
    await new Promise((r) => setTimeout(r, 20));
    expect(addBookForSync).toHaveBeenCalledTimes(3);
    expect(await recordTitled('Reddedilen')).toMatchObject({ title: 'Reddedilen', attempts: 3, failed: true });
  });

  it('never counts an expired session, even three times, and sends once the session is back', async () => {
    await enqueueBook('user-a', { title: 'Oturum', libraryIds: ['lib-1'] });
    await enqueueBook('user-a', { title: 'Arkadaki', libraryIds: ['lib-1'] });
    let sessionValid = false;
    const addBookForSync = vi.fn(async () => {
      if (!sessionValid) throw expiredJwt;
      return { id: 'saved' };
    });
    const { result } = renderSync(addBookForSync);

    await waitFor(() => expect(addBookForSync).toHaveBeenCalledTimes(1));
    await syncAgain();
    await waitFor(() => expect(addBookForSync).toHaveBeenCalledTimes(2));
    await syncAgain();
    await waitFor(() => expect(addBookForSync).toHaveBeenCalledTimes(3));
    await new Promise((r) => setTimeout(r, 20));

    const waiting = await recordTitled('Oturum');
    expect(waiting.attempts).toBeUndefined();
    expect(waiting.failed).toBeUndefined();
    // The session problem stops the whole sync: the book behind it waited too.
    expect(addBookForSync.mock.calls.every(([fields]) => fields.title === 'Oturum')).toBe(true);
    expect(result.current.failedCount).toBe(0);

    sessionValid = true;
    await syncAgain();
    await waitFor(async () => expect(await getQueuedBooks('user-a')).toEqual([]));
  });

  it('leaves records waiting without counting after a network failure', async () => {
    await enqueueBook('user-a', { title: 'Ağ', libraryIds: ['lib-1'] });
    await enqueueBook('user-a', { title: 'Arkadaki', libraryIds: ['lib-1'] });
    const addBookForSync = vi.fn().mockRejectedValue({ code: '', message: 'TypeError: Failed to fetch' });

    renderSync(addBookForSync);

    await waitFor(() => expect(addBookForSync).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 20));
    expect((await getQueuedBooks('user-a')).map((r) => [r.title, r.attempts])).toEqual([['Ağ', undefined], ['Arkadaki', undefined]]);
  });

  it('skips a duplicate book id without counting it, and sends the next record', async () => {
    await enqueueBook('user-a', { title: 'Çift', libraryIds: ['lib-1'] });
    await enqueueBook('user-a', { title: 'Sonraki', libraryIds: ['lib-1'] });
    const addBookForSync = vi.fn(async (fields) => {
      if (fields.title === 'Çift') throw { code: '23505', message: 'duplicate key value violates unique constraint "books_pkey"' };
      return { id: 'saved' };
    });

    renderSync(addBookForSync);

    await waitFor(async () => expect(await recordTitled('Sonraki')).toBeUndefined());
    expect((await recordTitled('Çift')).attempts).toBeUndefined();
  });
});
