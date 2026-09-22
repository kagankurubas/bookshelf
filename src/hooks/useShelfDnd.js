import { useState } from 'react';
import { countBooksInRow as countBooksInRowPure } from '../lib/shelfSpine';

// Handles drag-and-drop reordering and shelf-row add/remove in the shelf
// view. shelfCount comes from outside because resolving which record the
// active library is (and thus its current shelf-row count) is App.jsx's
// job - this hook only uses that count to update the DB.
export function useShelfDnd(books, activeLibraryId, shelfCount, updateLibrary, updateBookPosition) {
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null); // { shelfRow, bookId } | null
  // Touch screens don't support native HTML5 drag&drop, so a second move
  // path exists: "tap book -> tap target" - the id of the selected book.
  const [pickedBookId, setPickedBookId] = useState(null);

  const currentLibraryBooks = books.filter((b) => b.libraryIds.includes(activeLibraryId));

  const countBooksInRow = (libraryId, shelfRow) => countBooksInRowPure(books, libraryId, shelfRow);

  const handleAddShelfRow = async () => {
    try {
      await updateLibrary(activeLibraryId, { shelfCount: (shelfCount || 2) + 1 });
    } catch (err) {
      console.error(err);
    }
  };

  // Remove shelf row - books on the bottom row move to the end of the row above
  const handleRemoveShelfRow = async () => {
    const currentShelfCount = shelfCount || 2;
    if (currentShelfCount <= 1) return;

    const lastRow = currentShelfCount - 1;
    const targetRow = lastRow - 1;

    try {
      const rowBooks = currentLibraryBooks
        .filter((b) => (b.shelfRow ?? 0) === lastRow)
        .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));

      if (rowBooks.length > 0) {
        const targetRowCount = countBooksInRow(activeLibraryId, targetRow);
        await Promise.all(
          rowBooks.map((b, i) => updateBookPosition(b.id, targetRow, targetRowCount + i))
        );
      }

      await updateLibrary(activeLibraryId, { shelfCount: currentShelfCount - 1 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragStart = (e, bookId) => {
    setDraggedBookId(bookId);
    e.dataTransfer.setData('text/plain', bookId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setDragOverTarget(null);
  };

  const onDragOverAt = (shelfRow, bookId) => {
    setDragOverTarget({ shelfRow, bookId });
  };

  // targetBookId === null -> append to the end of that row. Both native
  // mouse drag-and-drop (handleDropAt) and tap-to-select-and-move
  // (handlePlaceBook) use this same reordering logic.
  const moveBookTo = async (activeBookId, targetShelfRow, targetBookId) => {
    const activeBook = books.find((b) => b.id === activeBookId);
    if (!activeBook) return;

    const originRow = activeBook.shelfRow ?? 0;

    const rows = {};
    currentLibraryBooks.forEach((b) => {
      const row = b.shelfRow ?? 0;
      if (!rows[row]) rows[row] = [];
      rows[row].push(b);
    });
    Object.values(rows).forEach((arr) => arr.sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0)));

    rows[originRow] = (rows[originRow] || []).filter((b) => b.id !== activeBookId);
    if (!rows[targetShelfRow]) rows[targetShelfRow] = [];

    const insertIndex = targetBookId === null
      ? rows[targetShelfRow].length
      : (() => {
          const idx = rows[targetShelfRow].findIndex((b) => b.id === targetBookId);
          return idx === -1 ? rows[targetShelfRow].length : idx;
        })();

    rows[targetShelfRow].splice(insertIndex, 0, activeBook);

    const touchedRows = new Set([originRow, targetShelfRow]);
    const updates = [];
    touchedRows.forEach((rowKey) => {
      (rows[rowKey] || []).forEach((b, idx) => {
        if ((b.shelfRow ?? 0) !== rowKey || (b.slotIndex ?? 0) !== idx) {
          updates.push(updateBookPosition(b.id, rowKey, idx));
        }
      });
    });

    try {
      await Promise.all(updates);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropAt = async (targetShelfRow, targetBookId) => {
    await moveBookTo(draggedBookId, targetShelfRow, targetBookId);
    handleDragEnd();
  };

  // Selected/deselected by tapping the handle on the book (MoveHandleIcon)
  // - tapping the same book again cancels the selection.
  const handlePickBook = (bookId) => {
    setPickedBookId((current) => (current === bookId ? null : bookId));
  };

  const cancelPick = () => setPickedBookId(null);

  // targetBookId === null -> move to the end of that row
  const handlePlaceBook = async (targetShelfRow, targetBookId) => {
    if (!pickedBookId) return;
    await moveBookTo(pickedBookId, targetShelfRow, targetBookId);
    setPickedBookId(null);
  };

  // Centralizes the same "what does a click mean" branch (cancel/move when
  // selected, open otherwise) for ShelfView's 3 target types (empty row,
  // book spine, add area) - book === null represents an empty area.
  const getSlotInteractionProps = (shelfRow, book, onOpen) => {
    const bookId = book?.id ?? null;
    const onClick = () => {
      if (pickedBookId !== null) {
        if (book && pickedBookId === bookId) cancelPick();
        else handlePlaceBook(shelfRow, bookId);
        return;
      }
      if (book && onOpen) onOpen(book);
    };
    const onDragOver = (e) => {
      e.preventDefault();
      onDragOverAt(shelfRow, bookId);
    };
    const onDrop = (e) => {
      e.preventDefault();
      handleDropAt(shelfRow, bookId);
    };
    const props = { onClick, onDragOver, onDrop };
    if (book) {
      props.draggable = true;
      props.onDragStart = (e) => handleDragStart(e, book.id);
      props.onDragEnd = handleDragEnd;
    }
    return props;
  };

  return {
    draggedBookId,
    dragOverTarget,
    pickedBookId,
    countBooksInRow,
    getSlotInteractionProps,
    handleAddShelfRow,
    handleRemoveShelfRow,
    handleDragStart,
    handleDragEnd,
    onDragOverAt,
    handleDropAt,
    handlePickBook,
    handlePlaceBook,
    cancelPick,
  };
}
