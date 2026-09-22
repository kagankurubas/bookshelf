import { useState } from 'react';

// Centralizes active-library selection, the "every book also belongs to the
// default library" invariant, and library-deletion orchestration - turns
// logic App.jsx used to re-derive in a scattered way into one module.
export function useLibrary({ libraries, addBook, editBook, deleteBook, refetchBooks, deleteLibrary: deleteLibraryRow, refreshStats }) {
  const [explicitActiveLibraryId, setActiveLibraryId] = useState(null);

  const defaultLibrary = libraries.find((lib) => lib.isDefault) || libraries[0] || null;
  const activeLibraryId = explicitActiveLibraryId ?? defaultLibrary?.id ?? null;
  const activeLibrary = libraries.find((lib) => lib.id === activeLibraryId) || libraries[0] || null;

  // The default library can't be deleted and every book always stays
  // linked to it - this way, even if another library gets deleted, books
  // don't end up "orphaned" in the database, staying invisible or
  // conflicting when re-added.
  const withDefaultLibrary = (libraryIds) => {
    const ids = new Set(libraryIds || []);
    if (defaultLibrary?.id) ids.add(defaultLibrary.id);
    return Array.from(ids);
  };

  // Batch scanning (BatchScanner) adds N books back to back - instead of
  // triggering a separate stats refetch after each add, the calling loop
  // calls refreshStats() once when it finishes (see BatchScanner.jsx).
  const addBookWithoutStatsRefresh = (fields) =>
    addBook({ ...fields, libraryIds: withDefaultLibrary(fields.libraryIds) });

  const addBookToLibrary = async (fields) => {
    const result = await addBookWithoutStatsRefresh(fields);
    refreshStats();
    return result;
  };

  const editBookInLibrary = async (id, fields) => {
    const result = await editBook(id, { ...fields, libraryIds: withDefaultLibrary(fields.libraryIds) });
    refreshStats();
    return result;
  };

  const deleteBookFromLibrary = async (id) => {
    const result = await deleteBook(id);
    refreshStats();
    return result;
  };

  const deleteLibrary = async (libraryId) => {
    await deleteLibraryRow(libraryId);
    setActiveLibraryId(null);
    await refetchBooks();
  };

  return {
    activeLibraryId,
    activeLibrary,
    setActiveLibraryId,
    addBook: addBookToLibrary,
    addBookWithoutStatsRefresh,
    editBook: editBookInLibrary,
    deleteBook: deleteBookFromLibrary,
    deleteLibrary,
    refreshStats,
  };
}
