import { useState } from 'react';

// Raf gorunumundeki surukle-birak yeniden siralama ve raf kati ekleme/silme
// mantigini tasir. shelfCount disaridan geliyor cunku aktif kitapligin hangi
// kayit oldugunu (ve dolayisiyla guncel raf kati sayisini) cozmek App.jsx'in
// isi - bu hook sadece o sayiyi kullanarak DB guncellemesi yapar.
export function useShelfDnd(books, activeLibraryId, shelfCount, updateLibrary, updateBookPosition) {
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null); // { shelfRow, bookId } | null

  const currentLibraryBooks = books.filter((b) => b.libraryIds.includes(activeLibraryId));

  // Bir kitaplığın belirli bir raf katında kaç kitap oldugunu sayar - yeni
  // kitaplar bu katin sonuna eklenir (shelf_row: 0, sirali slot_index).
  const countBooksInRow = (libraryId, shelfRow) =>
    books.filter((b) => b.libraryIds.includes(libraryId) && (b.shelfRow ?? 0) === shelfRow).length;

  // Yeni Raf Katı Ekle
  const handleAddShelfRow = async () => {
    try {
      await updateLibrary(activeLibraryId, { shelfCount: (shelfCount || 2) + 1 });
    } catch (err) {
      console.error(err);
    }
  };

  // Raf Katı Sil - en alttaki raftaki kitaplar bir üstteki rafın sonuna taşınır
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

  // targetBookId === null -> ilgili rafın sonuna ekle
  const handleDropAt = async (targetShelfRow, targetBookId) => {
    const activeBookId = draggedBookId;
    const activeBook = books.find((b) => b.id === activeBookId);
    if (!activeBook) {
      handleDragEnd();
      return;
    }

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

    handleDragEnd();
  };

  return {
    draggedBookId,
    dragOverTarget,
    countBooksInRow,
    handleAddShelfRow,
    handleRemoveShelfRow,
    handleDragStart,
    handleDragEnd,
    onDragOverAt,
    handleDropAt,
  };
}
