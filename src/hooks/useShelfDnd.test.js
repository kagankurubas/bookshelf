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

  // Dokunmatik ekranlarda native surukleme calismadigi icin "dokun -> sec ->
  // hedefe dokun" akisi ikinci bir tasima yolu olarak eklendi.
  it('handlePickBook selects a book, and picking it again cancels the selection', () => {
    const books = [book('A', 0, 0)];
    const { result } = setup(books);

    act(() => result.current.handlePickBook('A'));
    expect(result.current.pickedBookId).toBe('A');

    act(() => result.current.handlePickBook('A'));
    expect(result.current.pickedBookId).toBeNull();
  });

  it('cancelPick clears the picked book', () => {
    const books = [book('A', 0, 0)];
    const { result } = setup(books);

    act(() => result.current.handlePickBook('A'));
    act(() => result.current.cancelPick());

    expect(result.current.pickedBookId).toBeNull();
  });

  it('handlePlaceBook moves the picked book like handleDropAt and clears the selection', async () => {
    const books = [book('A', 0, 0), book('B', 0, 1), book('C', 1, 0)];
    const { result, updateBookPosition } = setup(books);

    act(() => result.current.handlePickBook('A'));
    // Place at the end of row 1 (targetBookId === null).
    await act(async () => result.current.handlePlaceBook(1, null));

    expect(updateBookPosition).toHaveBeenCalledWith('B', 0, 0);
    expect(updateBookPosition).toHaveBeenCalledWith('A', 1, 1);
    expect(result.current.pickedBookId).toBeNull();
  });

  it('handlePlaceBook is a no-op when nothing is picked', async () => {
    const books = [book('A', 0, 0)];
    const { result, updateBookPosition } = setup(books);

    await act(async () => result.current.handlePlaceBook(0, 'A'));

    expect(updateBookPosition).not.toHaveBeenCalled();
  });

  // getSlotInteractionProps, ShelfView'da 3 farkli hedef turune (bos sira,
  // kitap sirti, ekleme alani) kopyalanan "tiklama ne anlama gelir" dalini
  // tek bir yerde toplar - bkz. ShelfView.jsx.
  describe('getSlotInteractionProps', () => {
    it('opens the book on click when nothing is being picked', () => {
      const books = [book('A', 0, 0)];
      const { result } = setup(books);
      const onOpen = vi.fn();

      const props = result.current.getSlotInteractionProps(0, books[0], onOpen);
      act(() => props.onClick());

      expect(onOpen).toHaveBeenCalledWith(books[0]);
    });

    it('does nothing on click for an empty slot when nothing is being picked', () => {
      const { result } = setup([]);
      const onOpen = vi.fn();

      const props = result.current.getSlotInteractionProps(0, null, onOpen);
      act(() => props.onClick());

      expect(onOpen).not.toHaveBeenCalled();
    });

    it('cancels the pick on click when clicking the already-picked book, instead of opening it', () => {
      const books = [book('A', 0, 0)];
      const { result } = setup(books);
      const onOpen = vi.fn();

      act(() => result.current.handlePickBook('A'));
      const props = result.current.getSlotInteractionProps(0, books[0], onOpen);
      act(() => props.onClick());

      expect(result.current.pickedBookId).toBeNull();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('places the picked book on click at a different slot, instead of opening it', async () => {
      const books = [book('A', 0, 0), book('B', 1, 0)];
      const { result, updateBookPosition } = setup(books);
      const onOpen = vi.fn();

      act(() => result.current.handlePickBook('A'));
      const props = result.current.getSlotInteractionProps(1, books[1], onOpen);
      await act(async () => props.onClick());

      expect(updateBookPosition).toHaveBeenCalledWith('A', 1, 0);
      expect(result.current.pickedBookId).toBeNull();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('places the picked book on click at an empty slot (book === null)', async () => {
      const books = [book('A', 0, 0)];
      const { result, updateBookPosition } = setup(books);

      act(() => result.current.handlePickBook('A'));
      const props = result.current.getSlotInteractionProps(1, null);
      await act(async () => props.onClick());

      expect(updateBookPosition).toHaveBeenCalledWith('A', 1, 0);
      expect(result.current.pickedBookId).toBeNull();
    });

    it('sets the drag-over target and drops the currently dragged book there', async () => {
      const books = [book('A', 0, 0), book('B', 1, 0)];
      const { result, updateBookPosition } = setup(books);
      const dragOverEvent = { preventDefault: vi.fn() };

      act(() => result.current.handleDragStart(dragEvent(), 'A'));
      const props = result.current.getSlotInteractionProps(1, books[1]);

      act(() => props.onDragOver(dragOverEvent));
      expect(dragOverEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.dragOverTarget).toEqual({ shelfRow: 1, bookId: 'B' });

      await act(async () => props.onDrop({ preventDefault: vi.fn() }));
      expect(updateBookPosition).toHaveBeenCalledWith('A', 1, 0);
    });

    it('makes a book slot draggable and wires drag-start/drag-end to the book', () => {
      const books = [book('A', 0, 0)];
      const { result } = setup(books);

      const props = result.current.getSlotInteractionProps(0, books[0]);
      expect(props.draggable).toBe(true);

      act(() => props.onDragStart(dragEvent()));
      expect(result.current.draggedBookId).toBe('A');

      act(() => props.onDragEnd());
      expect(result.current.draggedBookId).toBeNull();
    });

    it('does not make an empty slot draggable', () => {
      const { result } = setup([]);
      const props = result.current.getSlotInteractionProps(0, null);

      expect(props.draggable).toBeFalsy();
      expect(props.onDragStart).toBeUndefined();
      expect(props.onDragEnd).toBeUndefined();
    });
  });
});
