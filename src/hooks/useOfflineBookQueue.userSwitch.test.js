// A different user signing in on the same tab: the queue sync must never
// file the new user's records into the previous user's libraries.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLibraries } from './useLibraries';
import { useOfflineBookQueue } from './useOfflineBookQueue';
import { supabase } from '../lib/supabaseClient';
import { countUnownedBooks, getQueuedBooks, removeQueuedBook } from '../lib/offlineBookQueue';

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/offlineBookQueue', () => ({
  clearQueue: vi.fn(),
  countUnownedBooks: vi.fn(),
  countUnsentBooks: vi.fn(),
  enqueueBook: vi.fn(),
  getQueuedBooks: vi.fn(),
  recordRejectedAttempt: vi.fn(),
  removeQueuedBook: vi.fn(),
}));

const librariesByUser = {
  'user-a': [{ id: 'lib-a', name: 'A', shelf_count: 2, is_default: true }],
  'user-b': [{ id: 'lib-b', name: 'B', shelf_count: 2, is_default: true }],
};

// Answers a libraries read with the rows of whichever user it filtered on.
function librariesQuery() {
  let userId;
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (_column, value) => {
      userId = value;
      return builder;
    },
    then: (resolve, reject) => Promise.resolve({ data: librariesByUser[userId], error: null }).then(resolve, reject),
  };
  return builder;
}

function useSignedInApp({ userId, addBookForSync }) {
  const { libraries, loading } = useLibraries(userId);
  return useOfflineBookQueue({
    userId,
    libraries,
    addBook: vi.fn(),
    addBookForSync,
    refreshStats: vi.fn(),
    isReady: Boolean(userId) && !loading,
  });
}

describe('offline queue when another user signs in on the same tab', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    supabase.from.mockImplementation(() => librariesQuery());
    countUnownedBooks.mockResolvedValue(0);
    removeQueuedBook.mockResolvedValue(undefined);
  });

  it("files the new user's records into the new user's own library only", async () => {
    getQueuedBooks.mockImplementation(async (ownerId) => (
      ownerId === 'user-b' ? [{ id: 7, ownerId: 'user-b', title: 'B kitaplıksız', libraryIds: [null] }] : []
    ));
    const addBookForSync = vi.fn().mockResolvedValue({ id: 'saved' });

    const { rerender } = renderHook((props) => useSignedInApp(props), {
      initialProps: { userId: 'user-a', addBookForSync },
    });
    await waitFor(() => expect(getQueuedBooks).toHaveBeenCalledWith('user-a'));

    rerender({ userId: 'user-b', addBookForSync });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(removeQueuedBook).toHaveBeenCalledWith(7));
    expect(addBookForSync).toHaveBeenCalledTimes(1);
    expect(addBookForSync).toHaveBeenCalledWith({ title: 'B kitaplıksız', libraryIds: ['lib-b'] });
  });
});

describe('useLibraries across a user switch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hands out nothing of the previous user's list while the new one loads", async () => {
    supabase.from.mockImplementation(() => librariesQuery());
    const { result, rerender } = renderHook(({ userId }) => useLibraries(userId), { initialProps: { userId: 'user-a' } });
    await waitFor(() => expect(result.current.libraries.map((l) => l.id)).toEqual(['lib-a']));

    let resolveB;
    supabase.from.mockImplementation(() => {
      const query = librariesQuery();
      const then = query.then;
      query.then = (resolve, reject) => new Promise((done) => { resolveB = done; }).then(() => then(resolve, reject));
      return query;
    });
    rerender({ userId: 'user-b' });

    expect(result.current.libraries).toEqual([]);
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(resolveB).toBeTypeOf('function'));
    expect(result.current.libraries).toEqual([]);

    await act(async () => {
      resolveB();
    });
    await waitFor(() => expect(result.current.libraries.map((l) => l.id)).toEqual(['lib-b']));
    expect(result.current.loading).toBe(false);
  });

  it('shows the error instead of loading forever when the new user\'s list fails to load', async () => {
    supabase.from.mockImplementation(() => librariesQuery());
    const { result, rerender } = renderHook(({ userId }) => useLibraries(userId), { initialProps: { userId: 'user-a' } });
    await waitFor(() => expect(result.current.libraries).toHaveLength(1));

    const failure = new Error('network down');
    supabase.from.mockImplementation(() => {
      const query = librariesQuery();
      query.then = (resolve, reject) => Promise.resolve({ data: null, error: failure }).then(resolve, reject);
      return query;
    });
    rerender({ userId: 'user-b' });

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.libraries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
