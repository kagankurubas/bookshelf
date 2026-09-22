import {
  parseCsvRows,
  getTitleOrSkip,
  getDateFinishedIfCompleted,
  wrapNote,
  skipIfMalformedRow,
  BASE_STATUS_MAP,
  DEFAULT_STATUS,
} from './csvImportShared';

// Columns we check to recognize Goodreads' actual export header - all must
// be present. Source: verified against a real Goodreads export header
// (gist.github.com/tmcw/f077b2f174a0194f62b94bec4e88f4d0).
const EXPECTED_GOODREADS_COLUMNS = ['Title', 'Author', 'Exclusive Shelf'];

// Maps Goodreads' "Exclusive Shelf" values to BookShelf's Turkish status
// names. Goodreads has no "did-not-finish" concept - unrecognized/empty
// values fall back to Başlanmadı. The three common statuses come from
// csvImportShared.
const SHELF_TO_STATUS = { ...BASE_STATUS_MAP };

// Goodreads exports the ISBN/ISBN13 columns wrapped as an Excel formula
// like ="1234567890123", to preserve leading zeros/long numbers in Excel -
// we strip that wrapper here.
function stripIsbnWrapper(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return '';
  const match = value.match(/^="?([^"]*)"?$/);
  return match ? match[1].trim() : value;
}

function parseIntOrDefault(rawValue, fallback) {
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseIntOrNull(rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') return null;
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function firstNonEmpty(...values) {
  return values.find((v) => v && v.trim().length > 0);
}

// Maps raw Goodreads CSV text to BookShelf's bookFields shape (see
// useBooks.js -> mapBookRow/addBook). No Supabase/DOM dependency - pure
// function, testable without mocks.
//
// Return value is one of two shapes:
//  - { error: 'malformed' | 'wrong-format' }  -> no row was processed
//  - { bookFields: [...], skippedRows: [...] } -> success (may be partially skipped)
export function parseGoodreadsCsv(csvText) {
  const parseResult = parseCsvRows(csvText, (fields) =>
    EXPECTED_GOODREADS_COLUMNS.every((col) => fields.includes(col))
  );
  if (parseResult.error) {
    return parseResult;
  }

  const bookFields = [];
  const skippedRows = [];

  parseResult.rows.forEach((row, index) => {
    if (skipIfMalformedRow(index, parseResult.malformedRowIndices, skippedRows)) return;

    const title = getTitleOrSkip(row['Title'], index, skippedRows);
    if (title === null) return;

    const author = [row['Author'], row['Additional Authors']]
      .filter((a) => a && a.trim())
      .join(', ');

    const isbn = firstNonEmpty(stripIsbnWrapper(row['ISBN13']), stripIsbnWrapper(row['ISBN'])) || '';

    const shelf = (row['Exclusive Shelf'] || '').trim();
    const status = SHELF_TO_STATUS[shelf] || DEFAULT_STATUS;

    const dateFinished = getDateFinishedIfCompleted(status, row['Date Read']);

    const noteText = firstNonEmpty(row['My Review'], row['Private Notes']);

    bookFields.push({
      title,
      author,
      isbn,
      publisher: (row['Publisher'] || '').trim(),
      category: '',
      rating: parseIntOrDefault(row['My Rating'], 0),
      pageCount: parseIntOrNull(row['Number of Pages']),
      status,
      dateStarted: '',
      dateFinished,
      notesList: wrapNote(noteText),
    });
  });

  return { bookFields, skippedRows };
}
