import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAddOrQueueBook } from './useAddOrQueueBook';

describe('useAddOrQueueBook', () => {
  it('calls addBook directly when online, and returns its result unchanged (no behavior change)', async () => {
    const addBook = vi.fn().mockResolvedValue({ id: 'book-1' });
    const enqueueBook = vi.fn();
    const { result } = renderHook(() => useAddOrQueueBook({ isOnline: true, addBook, enqueueBook }));

    const outcome = await result.current({ title: 'Dune' });

    expect(addBook).toHaveBeenCalledWith({ title: 'Dune' });
    expect(enqueueBook).not.toHaveBeenCalled();
    expect(outcome).toEqual({ id: 'book-1' });
  });

  it('queues the book instead of calling addBook when offline, and returns an optimistic result', async () => {
    const addBook = vi.fn();
    const enqueueBook = vi.fn().mockResolvedValue(42);
    const { result } = renderHook(() => useAddOrQueueBook({ isOnline: false, addBook, enqueueBook }));

    const outcome = await result.current({ title: 'Dune' });

    expect(enqueueBook).toHaveBeenCalledWith({ title: 'Dune' });
    expect(addBook).not.toHaveBeenCalled();
    expect(outcome).toEqual({ queued: true });
  });

  it('bases the decision on the isOnline flag at call time, not on whether the write would fail', async () => {
    // If addBook actually rejects while isOnline === true (a real server
    // error), it is not queued - the error is thrown as-is.
    const addBook = vi.fn().mockRejectedValue(new Error('server error'));
    const enqueueBook = vi.fn();
    const { result } = renderHook(() => useAddOrQueueBook({ isOnline: true, addBook, enqueueBook }));

    await expect(result.current({ title: 'Dune' })).rejects.toThrow('server error');
    expect(enqueueBook).not.toHaveBeenCalled();
  });
});
