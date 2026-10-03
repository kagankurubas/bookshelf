import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineBookQueue } from './useOfflineBookQueue';
import { QueueUnavailableError } from '../lib/saveErrors';
import {
  clearQueue,
  countUnownedBooks,
  countUnsentBooks,
  enqueueBook,
  getQueuedBooks,
  recordRejectedAttempt,
  removeQueuedBook,
} from '../lib/offlineBookQueue';

vi.mock('../lib/offlineBookQueue', () => ({
  clearQueue: vi.fn(),
  countUnownedBooks: vi.fn(),
  countUnsentBooks: vi.fn(),
  recordRejectedAttempt: vi.fn(),
  enqueueBook: vi.fn(),
  getQueuedBooks: vi.fn(),
  removeQueuedBook: vi.fn(),
}));

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

const ownLibraries = [{ id: 'lib-1', name: 'Kitaplığım', isDefault: true }];

function renderQueue({ isReady = true, userId = 'user-a', retryDelayMs, libraries = ownLibraries } = {}) {
  const addBook = vi.fn().mockResolvedValue({ id: 'book-1' });
  const addBookForSync = vi.fn().mockResolvedValue({ id: 'book-1' });
  const refreshStats = vi.fn();
  const hook = renderHook(
    ({ isReady, userId, libraries = ownLibraries }) => useOfflineBookQueue({ userId, libraries, addBook, addBookForSync, refreshStats, isReady, retryDelayMs }),
    { initialProps: { isReady, userId, libraries } }
  );
  return { ...hook, addBook, addBookForSync, refreshStats };
}

describe('useOfflineBookQueue', () => {
  // getQueuedBooks/enqueueBook/removeQueuedBook are module-level mocks
  // (shared across tests via vi.mock) - reset both their call history AND
  // any queued mockResolvedValueOnce()'s before every test, otherwise a
  // previous test's unconsumed queued values (or trailing in-flight
  // effects) can bleed into the next test's assertions.
  beforeEach(() => {
    vi.resetAllMocks();
    countUnownedBooks.mockResolvedValue(0);
    recordRejectedAttempt.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setNavigatorOnline(true);
  });

  it('reads the queue length once on mount for the initial queuedCount', async () => {
    getQueuedBooks.mockResolvedValue([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
    const { result } = renderQueue();

    await waitFor(() => expect(result.current.queuedCount).toBe(2));
  });

  it('adds directly (online) without touching the queue', async () => {
    getQueuedBooks.mockResolvedValue([]);
    const { result, addBook } = renderQueue();
    await waitFor(() => expect(result.current.queuedCount).toBe(0));

    await act(async () => {
      await result.current.addOrQueueBook({ title: 'Dune', libraryIds: ['lib-1'] });
    });

    expect(addBook).toHaveBeenCalledWith({ title: 'Dune', libraryIds: ['lib-1'] });
    expect(enqueueBook).not.toHaveBeenCalled();
  });

  it('queues (offline) and bumps queuedCount', async () => {
    setNavigatorOnline(false);
    getQueuedBooks.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 1, title: 'Dune' }]);
    enqueueBook.mockResolvedValue(1);
    const { result, addBook } = renderQueue();
    await waitFor(() => expect(result.current.queuedCount).toBe(0));

    await act(async () => {
      await result.current.addOrQueueBook({ title: 'Dune', libraryIds: ['lib-1'] });
    });

    expect(enqueueBook).toHaveBeenCalledWith('user-a', { title: 'Dune', libraryIds: ['lib-1'] });
    expect(addBook).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.queuedCount).toBe(1));
  });

  it('flushes the queue once isReady becomes true while already online, removing each synced item and refreshing stats once', async () => {
    getQueuedBooks
      .mockResolvedValueOnce([]) // initial mount read
      .mockResolvedValueOnce([{ id: 1, ownerId: 'user-a', title: 'Kitap 1' }, { id: 2, ownerId: 'user-a', title: 'Kitap 2' }]) // flush read
      .mockResolvedValueOnce([]); // post-flush refreshQueuedCount

    const { result, rerender, addBookForSync, refreshStats } = renderQueue({ isReady: false });
    rerender({ isReady: true, userId: 'user-a' });

    // queuedCount'un 0'a donmesi, flush'un (sondaki refreshQueuedCount()
    // dahil) tamamen bittiginin kesin isareti.
    await waitFor(() => expect(result.current.queuedCount).toBe(0));
    expect(addBookForSync).toHaveBeenCalledTimes(2);
    expect(addBookForSync).toHaveBeenNthCalledWith(1, { title: 'Kitap 1', libraryIds: ['lib-1'] });
    expect(addBookForSync).toHaveBeenNthCalledWith(2, { title: 'Kitap 2', libraryIds: ['lib-1'] });
    expect(getQueuedBooks).toHaveBeenCalledWith('user-a');
    expect(getQueuedBooks.mock.calls.every(([ownerId]) => ownerId === 'user-a')).toBe(true);
    expect(removeQueuedBook).toHaveBeenCalledWith(1);
    expect(removeQueuedBook).toHaveBeenCalledWith(2);
    expect(refreshStats).toHaveBeenCalledTimes(1);
  });

  it('stops the flush at the first network failure, leaving remaining items queued (not calling addBookForSync for them)', async () => {
    getQueuedBooks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, title: 'Kitap 1' }, { id: 2, title: 'Kitap 2' }])
      .mockResolvedValueOnce([{ id: 2, title: 'Kitap 2' }]);

    const addBook = vi.fn();
    const addBookForSync = vi.fn().mockRejectedValueOnce({ code: '', message: 'TypeError: Failed to fetch' });
    const refreshStats = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result, rerender } = renderHook(
      ({ isReady }) => useOfflineBookQueue({ userId: 'user-a', libraries: ownLibraries, addBook, addBookForSync, refreshStats, isReady }),
      { initialProps: { isReady: false } }
    );
    rerender({ isReady: true });

    // queuedCount'un 1'e (yalnizca basarisiz kalan ikinci kitap) yerlesmesi,
    // flush denemesinin (basarili/basarisiz tum adimlariyla) tamamen
    // bittiginin kesin isareti - sadece addBookForSync cagri sayisini
    // beklemek, henuz surmekte olan sondaki refreshQueuedCount() adimini
    // kacirip test'i erken bitirebilirdi.
    await waitFor(() => expect(result.current.queuedCount).toBe(1));
    expect(addBookForSync).toHaveBeenCalledTimes(1);
    expect(removeQueuedBook).not.toHaveBeenCalled();
    expect(refreshStats).not.toHaveBeenCalled();
  });

  it('does not flush on the isReady transition when the browser is offline', async () => {
    setNavigatorOnline(false);
    getQueuedBooks.mockResolvedValue([{ id: 1, title: 'Kitap 1' }]);
    const { rerender, addBookForSync } = renderQueue({ isReady: false });
    rerender({ isReady: true, userId: 'user-a' });

    await new Promise((r) => setTimeout(r, 0));
    expect(addBookForSync).not.toHaveBeenCalled();
  });

  it('syncs nothing while signed out, even when the browser comes back online', async () => {
    getQueuedBooks.mockResolvedValue([{ id: 1, ownerId: 'user-a', title: 'Kitap 1' }]);
    const { addBookForSync } = renderQueue({ isReady: false, userId: null });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(addBookForSync).not.toHaveBeenCalled();
    expect(getQueuedBooks.mock.calls.every(([ownerId]) => ownerId === null)).toBe(true);
  });

  it("syncs the next user's own records when another user signs in on the same tab", async () => {
    getQueuedBooks.mockImplementation(async (ownerId) => (
      ownerId === 'user-b' ? [{ id: 7, ownerId: 'user-b', title: 'B Kitabi' }] : []
    ));
    const { rerender, addBookForSync } = renderQueue({ isReady: true, userId: 'user-a' });
    await waitFor(() => expect(getQueuedBooks).toHaveBeenCalledWith('user-a'));
    expect(addBookForSync).not.toHaveBeenCalled();

    rerender({ isReady: true, userId: 'user-b' });

    await waitFor(() => expect(addBookForSync).toHaveBeenCalledWith({ title: 'B Kitabi', libraryIds: ['lib-1'] }));
    expect(addBookForSync).toHaveBeenCalledTimes(1);
    expect(removeQueuedBook).toHaveBeenCalledWith(7);
  });

  it('reports how many books a sign-out would discard, and discards them on request', async () => {
    getQueuedBooks.mockResolvedValue([{ id: 1, ownerId: 'user-a', title: 'Kitap 1' }]);
    countUnsentBooks.mockResolvedValue(3);
    clearQueue.mockResolvedValue(undefined);
    setNavigatorOnline(false);
    const { result } = renderQueue({ isReady: false });
    await waitFor(() => expect(result.current.queuedCount).toBe(1));

    await expect(result.current.countUnsentForSignOut()).resolves.toBe(3);
    expect(countUnsentBooks).toHaveBeenCalledWith('user-a');

    await act(async () => {
      await result.current.discardQueue();
    });
    expect(clearQueue).toHaveBeenCalledTimes(1);
    expect(result.current.queuedCount).toBe(0);
  });

  it('reports nothing to discard while signed out', async () => {
    getQueuedBooks.mockResolvedValue([]);
    const { result } = renderQueue({ isReady: false, userId: null });

    await expect(result.current.countUnsentForSignOut()).resolves.toBe(0);
    expect(countUnsentBooks).not.toHaveBeenCalled();
  });

  describe('when the queue itself cannot be opened', () => {
    it('does not crash the sync, and retries it once a moment later', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      getQueuedBooks
        .mockRejectedValueOnce(new QueueUnavailableError()) // mount count read
        .mockRejectedValueOnce(new QueueUnavailableError()) // first flush
        .mockResolvedValueOnce([{ id: 4, ownerId: 'user-a', title: 'Gecikmeli' }]) // retried flush
        .mockResolvedValue([]);
      const { addBookForSync } = renderQueue({ isReady: true, retryDelayMs: 20 });

      await new Promise((r) => setTimeout(r, 5));
      expect(addBookForSync).not.toHaveBeenCalled();

      await waitFor(() => expect(addBookForSync).toHaveBeenCalledWith({ title: 'Gecikmeli', libraryIds: ['lib-1'] }));
      expect(removeQueuedBook).toHaveBeenCalledWith(4);
    });

    it('rejects an offline add with the transient error, while online adds keep working', async () => {
      getQueuedBooks.mockResolvedValue([]);
      enqueueBook.mockRejectedValue(new QueueUnavailableError());
      setNavigatorOnline(false);
      const offline = renderQueue({ isReady: false });

      await expect(offline.result.current.addOrQueueBook({ title: 'Dune', libraryIds: ['lib-1'] })).rejects.toBeInstanceOf(QueueUnavailableError);
      offline.unmount();

      setNavigatorOnline(true);
      const online = renderQueue({ isReady: false });
      await act(async () => {
        await online.result.current.addOrQueueBook({ title: 'Dune', libraryIds: ['lib-1'] });
      });
      expect(online.addBook).toHaveBeenCalledWith({ title: 'Dune', libraryIds: ['lib-1'] });
    });
  });

  describe('when the user has no library', () => {
    it('leaves every record waiting, untouched, on both sync triggers', async () => {
      getQueuedBooks.mockResolvedValue([
        { id: 1, ownerId: 'user-a', title: 'Kitaplıksız', libraryIds: [null] },
        { id: 2, ownerId: 'user-a', title: 'Sonraki', libraryIds: [null] },
      ]);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result, addBookForSync } = renderQueue({ isReady: true, libraries: [] });
      await waitFor(() => expect(result.current.queuedCount).toBe(2));
      const readsBeforeSync = getQueuedBooks.mock.calls.length;

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });
      await new Promise((r) => setTimeout(r, 0));

      expect(addBookForSync).not.toHaveBeenCalled();
      expect(removeQueuedBook).not.toHaveBeenCalled();
      expect(result.current.queuedCount).toBe(2);
      // Waiting is a decision, not a failure: the records are not even read
      // for sending, and nothing is logged as an error.
      expect(getQueuedBooks.mock.calls.length).toBe(readsBeforeSync);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('sends the waiting records, filed into the new library, as soon as one exists', async () => {
      getQueuedBooks
        .mockResolvedValueOnce([{ id: 1, ownerId: 'user-a', title: 'Kitaplıksız', libraryIds: [null] }]) // count
        .mockResolvedValueOnce([{ id: 1, ownerId: 'user-a', title: 'Kitaplıksız', libraryIds: [null] }]) // flush
        .mockResolvedValue([]);
      const { rerender, addBookForSync } = renderQueue({ isReady: true, libraries: [] });
      await new Promise((r) => setTimeout(r, 0));
      expect(addBookForSync).not.toHaveBeenCalled();

      rerender({ isReady: true, userId: 'user-a', libraries: [{ id: 'lib-new', isDefault: true }] });

      await waitFor(() => expect(addBookForSync).toHaveBeenCalledWith({ title: 'Kitaplıksız', libraryIds: ['lib-new'] }));
      expect(removeQueuedBook).toHaveBeenCalledWith(1);
    });
  });

  it('files a record queued into a since-deleted library into the default one', async () => {
    getQueuedBooks.mockResolvedValue([{ id: 3, ownerId: 'user-a', title: 'Eski raf', libraryIds: ['lib-deleted'] }]);
    const { addBookForSync } = renderQueue({ isReady: true });

    await waitFor(() => expect(addBookForSync).toHaveBeenCalledWith({ title: 'Eski raf', libraryIds: ['lib-1'] }));
  });

  it('files a library-less record into the first library when none is marked default', async () => {
    getQueuedBooks.mockResolvedValue([{ id: 5, ownerId: 'user-a', title: 'Varsayılansız', libraryIds: [null] }]);
    const libraries = [
      { id: 'lib-oldest', name: 'İlk', isDefault: false },
      { id: 'lib-newer', name: 'Sonraki', isDefault: false },
    ];
    const { addBookForSync } = renderQueue({ isReady: true, libraries });

    await waitFor(() => expect(addBookForSync).toHaveBeenCalledWith({ title: 'Varsayılansız', libraryIds: ['lib-oldest'] }));
    expect(removeQueuedBook).toHaveBeenCalledWith(5);
  });

  it('counts failed records and unowned leftovers apart from the ones still waiting', async () => {
    getQueuedBooks.mockResolvedValue([
      { id: 1, ownerId: 'user-a', title: 'Bekleyen' },
      { id: 2, ownerId: 'user-a', title: 'Gönderilemeyen', attempts: 3, failed: true },
    ]);
    countUnownedBooks.mockResolvedValue(2);
    setNavigatorOnline(false);
    const { result } = renderQueue({ isReady: false });

    await waitFor(() => expect(result.current.failedCount).toBe(3));
    expect(result.current.queuedCount).toBe(1);
  });

  describe('when sync triggers overlap in one tab', () => {
    it('never sends the same record twice, and still runs once more for a trigger that came in meanwhile', async () => {
      let remaining = [
        { id: 1, ownerId: 'user-a', title: 'Birinci', libraryIds: ['lib-1'] },
        { id: 2, ownerId: 'user-a', title: 'İkinci', libraryIds: ['lib-1'] },
      ];
      getQueuedBooks.mockImplementation(async () => remaining);
      removeQueuedBook.mockImplementation(async (id) => {
        remaining = remaining.filter((record) => record.id !== id);
      });
      let releaseFirst;
      const addBookForSync = vi.fn((fields) => (
        fields.title === 'Birinci' && !releaseFirst.done
          ? new Promise((resolve) => { releaseFirst.resolve = () => { releaseFirst.done = true; resolve({ id: 'saved' }); }; })
          : Promise.resolve({ id: 'saved' })
      ));
      releaseFirst = { done: false };
      const refreshStats = vi.fn();

      // Trigger 1: the load-time sync starts and stalls on the first record.
      renderHook(() => useOfflineBookQueue({
        userId: 'user-a', libraries: ownLibraries, addBook: vi.fn(), addBookForSync, refreshStats, isReady: true,
      }));
      await waitFor(() => expect(addBookForSync).toHaveBeenCalledTimes(1));

      // Triggers 2 and 3 arrive while it is still running.
      await act(async () => {
        window.dispatchEvent(new Event('online'));
        window.dispatchEvent(new Event('online'));
      });
      await new Promise((r) => setTimeout(r, 10));
      expect(addBookForSync).toHaveBeenCalledTimes(1);

      await act(async () => {
        releaseFirst.resolve();
      });

      await waitFor(() => expect(remaining).toEqual([]));
      const sentTitles = addBookForSync.mock.calls.map(([fields]) => fields.title);
      expect(sentTitles).toEqual(['Birinci', 'İkinci']);
      // The follow-up pass ran (the queue was read again) but found nothing new.
      await waitFor(() => expect(getQueuedBooks.mock.calls.length).toBeGreaterThanOrEqual(3));
    });

    it('lets the retry timer join the same single sync', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      let remaining = [{ id: 9, ownerId: 'user-a', title: 'Gecikmeli', libraryIds: ['lib-1'] }];
      let firstRead = true;
      getQueuedBooks.mockImplementation(async () => {
        if (firstRead) {
          firstRead = false;
          throw new QueueUnavailableError();
        }
        return remaining;
      });
      removeQueuedBook.mockImplementation(async (id) => {
        remaining = remaining.filter((record) => record.id !== id);
      });
      const { addBookForSync } = renderQueue({ isReady: true, retryDelayMs: 15 });
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => expect(remaining).toEqual([]));
      await new Promise((r) => setTimeout(r, 30));
      expect(addBookForSync.mock.calls.filter(([fields]) => fields.title === 'Gecikmeli')).toHaveLength(1);
    });
  });
});
