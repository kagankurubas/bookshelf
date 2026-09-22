import Papa from 'papaparse';

// Separators for packing multiple values into one CSV cell (library names,
// note text). Papa.unparse quotes/escapes embedded newlines correctly, so
// even "\n---\n" is safe inside a single cell.
const LIBRARY_NAME_SEPARATOR = '; ';
const NOTE_TEXT_SEPARATOR = '\n---\n';

// UI-only fields (coverImage, coverPosition, shelfId, shelfRow, slotIndex)
// are deliberately left out here - meaningless outside the app or on
// re-import (spec: "Fields excluded from export").
function resolveLibraryNames(book, libraryNameById) {
  return (book.libraryIds || [])
    .map((id) => libraryNameById[id])
    .filter(Boolean);
}

function toCommonFields(book, libraryNameById) {
  return {
    title: book.title || '',
    author: book.author || '',
    publisher: book.publisher || '',
    category: book.category || '',
    status: book.status || '',
    rating: book.rating ?? 0,
    isbn: book.isbn || '',
    pageCount: book.pageCount ?? null,
    isFavorite: !!book.isFavorite,
    dateStarted: book.dateStarted || '',
    dateFinished: book.dateFinished || '',
    createdAt: book.createdAt || '',
    libraryNames: resolveLibraryNames(book, libraryNameById),
  };
}

// CSV: library names joined with "; ", note text joined with "\n---\n" -
// the { text, date } note structure is JSON-only, CSV keeps just the text
// (spec: "Exported fields").
export function buildBooksCsv(books, libraryNameById = {}) {
  const rows = books.map((book) => {
    const fields = toCommonFields(book, libraryNameById);
    const notesList = book.notesList || [];
    return {
      title: fields.title,
      author: fields.author,
      publisher: fields.publisher,
      category: fields.category,
      status: fields.status,
      rating: fields.rating,
      isbn: fields.isbn,
      pageCount: fields.pageCount,
      isFavorite: fields.isFavorite,
      dateStarted: fields.dateStarted,
      dateFinished: fields.dateFinished,
      createdAt: fields.createdAt,
      libraries: fields.libraryNames.join(LIBRARY_NAME_SEPARATOR),
      notes: notesList.map((n) => n.text).join(NOTE_TEXT_SEPARATOR),
    };
  });
  return Papa.unparse(rows);
}

// JSON: full backup format - library names as an array, notes kept as
// the full { text, date } structure.
export function buildBooksJson(books, libraryNameById = {}) {
  const rows = books.map((book) => {
    const fields = toCommonFields(book, libraryNameById);
    const notesList = book.notesList || [];
    return {
      title: fields.title,
      author: fields.author,
      publisher: fields.publisher,
      category: fields.category,
      status: fields.status,
      rating: fields.rating,
      isbn: fields.isbn,
      pageCount: fields.pageCount,
      isFavorite: fields.isFavorite,
      dateStarted: fields.dateStarted,
      dateFinished: fields.dateFinished,
      createdAt: fields.createdAt,
      libraries: fields.libraryNames,
      notes: notesList.map((n) => ({ text: n.text, date: n.date })),
    };
  });
  return JSON.stringify(rows, null, 2);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

// bookshelf-export-YYYY-MM-DD.<extension> - local date at download time
// (spec: "Filename convention").
export function getExportFilename(extension, date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `bookshelf-export-${year}-${month}-${day}.${extension}`;
}
