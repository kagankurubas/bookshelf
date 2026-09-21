import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineBookQueue } from './useOfflineBookQueue';
import { enqueueBook, getQueuedBooks, removeQueuedBook } from '../lib/offlineBookQueue';

vi.mock('../lib/offlineBookQueue', () => ({
  enqueueBook: vi.fn(),
  getQueuedBooks: vi.fn(),
  removeQueuedBook: vi.fn(),
}));

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

function renderQueue({ isReady = true } = {}) {
  const addBook = vi.fn().mockResolvedValue({ id: 'book-1' });
  const addBookForSync = vi.fn().mockResolvedValue({ id: 'book-1' });
  const refreshStats = vi.fn();
  const hook = renderHook(
    ({ isReady }) => useOfflineBookQueue({ addBook, addBookForSync, refreshStats, isReady }),
    { initialProps: { isReady } }
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
      await result.current.addOrQueueBook({ title: 'Dune' });
    });

    expect(addBook).toHaveBeenCalledWith({ title: 'Dune' });
    expect(enqueueBook).not.toHaveBeenCalled();
  });

  it('queues (offline) and bumps queuedCount', async () => {
    setNavigatorOnline(false);
    getQueuedBooks.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 1, title: 'Dune' }]);
    enqueueBook.mockResolvedValue(1);
    const { result, addBook } = renderQueue();
    await waitFor(() => expect(result.current.queuedCount).toBe(0));

    await act(async () => {
      await result.current.addOrQueueBook({ title: 'Dune' });
    });

    expect(enqueueBook).toHaveBeenCalledWith({ title: 'Dune' });
    expect(addBook).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.queuedCount).toBe(1));
  });

  it('flushes the queue once isReady becomes true while already online, removing each synced item and refreshing stats once', async () => {
    getQueuedBooks
      .mockResolvedValueOnce([]) // initial mount read
      .mockResolvedValueOnce([{ id: 1, title: 'Kitap 1' }, { id: 2, title: 'Kitap 2' }]) // flush read
      .mockResolvedValueOnce([]); // post-flush refreshQueuedCount

    const { result, rerender, addBookForSync, refreshStats } = renderQueue({ isReady: false });
    rerender({ isReady: true });

    // queuedCount'un 0'a donmesi, flush'un (sondaki refreshQueuedCount()
    // dahil) tamamen bittiginin kesin isareti.
    await waitFor(() => expect(result.current.queuedCount).toBe(0));
    expect(addBookForSync).toHaveBeenCalledTimes(2);
    expect(addBookForSync).toHaveBeenNthCalledWith(1, { title: 'Kitap 1' });
    expect(addBookForSync).toHaveBeenNthCalledWith(2, { title: 'Kitap 2' });
    expect(removeQueuedBook).toHaveBeenCalledWith(1);
    expect(removeQueuedBook).toHaveBeenCalledWith(2);
    expect(refreshStats).toHaveBeenCalledTimes(1);
  });

  it('stops the flush at the first failure, leaving remaining items queued (not calling addBookForSync for them)', async () => {
    getQueuedBooks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, title: 'Kitap 1' }, { id: 2, title: 'Kitap 2' }])
      .mockResolvedValueOnce([{ id: 2, title: 'Kitap 2' }]);

    const addBook = vi.fn();
    const addBookForSync = vi.fn().mockRejectedValueOnce(new Error('network fail'));
    const refreshStats = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result, rerender } = renderHook(
      ({ isReady }) => useOfflineBookQueue({ addBook, addBookForSync, refreshStats, isReady }),
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
    rerender({ isReady: true });

    await new Promise((r) => setTimeout(r, 0));
    expect(addBookForSync).not.toHaveBeenCalled();
  });
});
