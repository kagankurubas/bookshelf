// Runs the queue hook against the real IndexedDB queue (fake-indexeddb),
// so records written by one user are checked end to end, not via mocks.
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfflineBookQueue } from './useOfflineBookQueue';
import { enqueueBook, getQueuedBooks } from '../lib/offlineBookQueue';

beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('bookshelf-offline-queue');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
});

describe('useOfflineBookQueue on a shared device', () => {
  it("never sends or touches another user's queued books, including ones without a library", async () => {
    await enqueueBook('user-a', { title: 'A kitaplıksız', libraryIds: [null] });
    await enqueueBook('user-a', { title: 'A kendi kitaplığında', libraryIds: ['lib-a'] });
    await enqueueBook('user-b', { title: 'B kitabı', libraryIds: ['lib-b'] });

    const addBookForSync = vi.fn().mockResolvedValue({ id: 'saved' });
    const refreshStats = vi.fn();
    renderHook(() => useOfflineBookQueue({
      userId: 'user-b', addBook: vi.fn(), addBookForSync, refreshStats, isReady: true,
    }));

    await waitFor(() => expect(refreshStats).toHaveBeenCalledTimes(1));
    expect(addBookForSync).toHaveBeenCalledTimes(1);
    expect(addBookForSync).toHaveBeenCalledWith({ title: 'B kitabı', libraryIds: ['lib-b'] });

    const stillQueuedForA = await getQueuedBooks('user-a');
    expect(stillQueuedForA.map((b) => [b.title, b.libraryIds])).toEqual([
      ['A kitaplıksız', [null]],
      ['A kendi kitaplığında', ['lib-a']],
    ]);
    expect(await getQueuedBooks('user-b')).toEqual([]);
  });

  it('counts only the signed-in user\'s queued books', async () => {
    await enqueueBook('user-a', { title: 'A1' });
    await enqueueBook('user-a', { title: 'A2' });
    await enqueueBook('user-b', { title: 'B1' });
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

    const { result } = renderHook(() => useOfflineBookQueue({
      userId: 'user-b', addBook: vi.fn(), addBookForSync: vi.fn(), refreshStats: vi.fn(), isReady: false,
    }));

    await waitFor(() => expect(result.current.queuedCount).toBe(1));
  });
});
