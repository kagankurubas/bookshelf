import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShelfDnd } from './useShelfDnd';

function book(id, shelfRow, slotIndex, libraryIds = ['lib-1']) {
  return { id, shelfRow, slotIndex, libraryIds };
}

function dragEvent() {
  return { dataTransfer: { setData: vi.fn(), effectAllowed: null } };
}

function setup(books, { shelfCount = 2 } = {}) {
  const updateLibrary = vi.fn(() => Promise.resolve());
  const updateBookPosition = vi.fn(() => Promise.resolve());
  const hook = renderHook(() =>
    useShelfDnd(books, 'lib-1', shelfCount, updateLibrary, updateBookPosition)
  );
  return { ...hook, updateLibrary, updateBookPosition };
}

describe('useShelfDnd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reorders books within the same shelf row and only updates the ones that moved', async () => {
    const books = [book('A', 0, 0), book('B', 0, 1), book('C', 0, 2)];
    const { result, updateBookPosition } = setup(books);

    act(() => result.current.handleDragStart(dragEvent(), 'C'));
    await act(async () => result.current.handleDropAt(0, 'B'));

    // A doesn't move, so it should never be touched.
    expect(updateBookPosition).not.toHaveBeenCalledWith('A', expect.anything(), expect.anything());
    // C is inserted before B: [A, C, B]
    expect(updateBookPosition).toHaveBeenCalledWith('C', 0, 1);
    expect(updateBookPosition).toHaveBeenCalledWith('B', 0, 2);
    expect(updateBookPosition).toHaveBeenCalledTimes(2);
  });

  it('moves a book to a different shelf row and reindexes both the origin and target rows', async () => {
    const books = [book('A', 0, 0), book('B', 0, 1), book('C', 1, 0)];
    const { result, updateBookPosition } = setup(books);

    act(() => result.current.handleDragStart(dragEvent(), 'A'));
    // Drop at the end of row 1 (targetBookId === null).
    await act(async () => result.current.handleDropAt(1, null));

    // Origin row 0 closes the gap: B moves from slot 1 to slot 0.
    expect(updateBookPosition).toHaveBeenCalledWith('B', 0, 0);
    // C stays at row 1 slot 0, untouched.
    expect(updateBookPosition).not.toHaveBeenCalledWith('C', expect.anything(), expect.anything());
    // A lands at the end of row 1 (after C).
    expect(updateBookPosition).toHaveBeenCalledWith('A', 1, 1);
    expect(updateBookPosition).toHaveBeenCalledTimes(2);
  });

  it('does nothing and clears drag state when the dragged book no longer exists', async () => {
    const books = [book('A', 0, 0)];
    const { result, updateBookPosition } = setup(books);

    act(() => result.current.handleDragStart(dragEvent(), 'missing-book'));
    await act(async () => result.current.handleDropAt(0, 'A'));

    expect(updateBookPosition).not.toHaveBeenCalled();
    expect(result.current.draggedBookId).toBeNull();
    expect(result.current.dragOverTarget).toBeNull();
  });

  it('tracks drag-over target and resets it on drag end', () => {
    const books = [book('A', 0, 0)];
    const { result } = setup(books);

    act(() => result.current.handleDragStart(dragEvent(), 'A'));
    expect(result.current.draggedBookId).toBe('A');

    act(() => result.current.onDragOverAt(0, 'A'));
    expect(result.current.dragOverTarget).toEqual({ shelfRow: 0, bookId: 'A' });

    act(() => result.current.handleDragEnd());
    expect(result.current.draggedBookId).toBeNull();
    expect(result.current.dragOverTarget).toBeNull();
  });

  it('handleAddShelfRow increases the shelf count for the active library', async () => {
    const { result, updateLibrary } = setup([], { shelfCount: 2 });

    await act(async () => result.current.handleAddShelfRow());

    expect(updateLibrary).toHaveBeenCalledWith('lib-1', { shelfCount: 3 });
  });

  it('handleRemoveShelfRow moves the last row books onto the row above, then shrinks shelf count', async () => {
    const books = [book('A', 0, 0), book('B', 1, 0), book('C', 1, 1)];
    const { result, updateLibrary, updateBookPosition } = setup(books, { shelfCount: 2 });

    await act(async () => result.current.handleRemoveShelfRow());

    // Row 1 books append after row 0's existing book (which had 1 book already).
    expect(updateBookPosition).toHaveBeenCalledWith('B', 0, 1);
    expect(updateBookPosition).toHaveBeenCalledWith('C', 0, 2);
    expect(updateLibrary).toHaveBeenCalledWith('lib-1', { shelfCount: 1 });
  });

  it('handleRemoveShelfRow is a no-op when only one shelf row remains', async () => {
    const { result, updateLibrary, updateBookPosition } = setup([], { shelfCount: 1 });

    await act(async () => result.current.handleRemoveShelfRow());

    expect(updateBookPosition).not.toHaveBeenCalled();
    expect(updateLibrary).not.toHaveBeenCalled();
  });
});
