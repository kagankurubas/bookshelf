import { useState } from 'react';

// Aktif kitaplik secimini, "her kitap ana kitapliga da aittir" degismezini
// ve kitaplik silme orkestrasyonunu tek yerde toplar - App.jsx'in dagitik
// olarak yeniden turettigi bu mantigi bir modul haline getirir.
export function useLibrary({ libraries, addBook, editBook, deleteBook, refetchBooks, deleteLibrary: deleteLibraryRow, refreshStats }) {
  const [explicitActiveLibraryId, setActiveLibraryId] = useState(null);

  const defaultLibrary = libraries.find((lib) => lib.isDefault) || libraries[0] || null;
  const activeLibraryId = explicitActiveLibraryId ?? defaultLibrary?.id ?? null;
  const activeLibrary = libraries.find((lib) => lib.id === activeLibraryId) || libraries[0] || null;

  // Ana kitaplık silinemez ve her kitap her zaman ona bağlı kalır - bu
  // sayede başka bir kitaplık silinse bile kitaplar veritabanında
  // "sahipsiz" kalıp hem görünmez olmuyor hem de tekrar eklenmeye
  // çalışılınca çakışmıyor.
  const withDefaultLibrary = (libraryIds) => {
    const ids = new Set(libraryIds || []);
    if (defaultLibrary?.id) ids.add(defaultLibrary.id);
    return Array.from(ids);
  };

  // Toplu tarama (BatchScanner) N kitabı art arda ekler - her ekleme sonrası
  // ayrı bir stats refetch tetiklemek yerine, çağıran döngü bitince bir kez
  // refreshStats() çağırır (bkz. BatchScanner.jsx).
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
