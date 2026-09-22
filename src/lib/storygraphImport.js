import {
  parseCsvRows,
  getTitleOrSkip,
  getDateFinishedIfCompleted,
  wrapNote,
  skipIfMalformedRow,
  BASE_STATUS_MAP,
  DEFAULT_STATUS,
} from './csvImportShared';

// Columns we check to recognize StoryGraph's actual export header (Title,
// Authors are always required). Read-status column is handled separately -
// see READ_STATUS_COLUMN_ALIASES.
const REQUIRED_COLUMNS = ['Title', 'Authors'];

// Sources disagree on StoryGraph's exact read-status column name: the
// primary source (github.com/mateusz-bak/openreads issue #525, from a real
// export) says "Read Status" (two words), some secondary sources show
// "ReadStatus" (one word). Since we can't resolve this ambiguity for
// certain, we write a tolerant column finder that recognizes both spellings -
// guessing wrong would silently fail import with "wrong-format", a worse
// user experience.
const READ_STATUS_COLUMN_ALIASES = ['Read Status', 'ReadStatus'];

// Maps StoryGraph's read-status values to BookShelf's Turkish status
// names. Unlike Goodreads, StoryGraph's "did-not-finish" (DNF) concept
// maps exactly to "Yarıda Bırakıldı". The three common statuses come from
// csvImportShared, DNF is added here as platform-specific.
const STATUS_TO_BOOKSHELF = {
  ...BASE_STATUS_MAP,
  'did-not-finish': 'Yarıda Bırakıldı',
};

function findReadStatusColumn(fields) {
  return READ_STATUS_COLUMN_ALIASES.find((col) => fields.includes(col)) || null;
}

// StoryGraph's "Star Rating" column arrives in 0.25 steps (e.g. 4.25, 3.5,
// 4.75). Spec decision: round to the nearest integer with Math.round(),
// clamp to 0-5. A raw value that's already an integer doesn't count as
// "rounded" - wasRounded is only true when a genuinely fractional value
// was converted to an integer, so callers can count how many ratings were
// rounded.
function roundAndClampRating(rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return { rating: 0, wasRounded: false };
  }
  const parsed = parseFloat(rawValue);
  if (Number.isNaN(parsed)) {
    return { rating: 0, wasRounded: false };
  }
  const rounded = Math.round(parsed);
  const clamped = Math.min(5, Math.max(0, rounded));
  return { rating: clamped, wasRounded: !Number.isInteger(parsed) };
}

// Maps raw StoryGraph CSV text to BookShelf's bookFields shape (see
// useBooks.js -> mapBookRow/addBook). No Supabase/DOM dependency - pure
// function, testable without mocks. Shares the same return contract as
// goodreadsImport.js, plus a roundedRatingsCount field.
//
// Return value is one of two shapes:
//  - { error: 'malformed' | 'wrong-format' }  -> no row was processed
//  - { bookFields: [...], skippedRows: [...], roundedRatingsCount }
export function parseStoryGraphCsv(csvText) {
  const parseResult = parseCsvRows(
    csvText,
    (fields) => REQUIRED_COLUMNS.every((col) => fields.includes(col)) && Boolean(findReadStatusColumn(fields))
  );
  if (parseResult.error) {
    return parseResult;
  }

  const readStatusColumn = findReadStatusColumn(parseResult.fields);
  const bookFields = [];
  const skippedRows = [];
  let roundedRatingsCount = 0;

  parseResult.rows.forEach((row, index) => {
    if (skipIfMalformedRow(index, parseResult.malformedRowIndices, skippedRows)) return;

    const title = getTitleOrSkip(row['Title'], index, skippedRows);
    if (title === null) return;

    const author = (row['Authors'] || '').trim();
    const isbn = (row['ISBN/UID'] || '').trim();

    const statusRaw = (row[readStatusColumn] || '').trim();
    const status = STATUS_TO_BOOKSHELF[statusRaw] || DEFAULT_STATUS;

    const dateFinished = getDateFinishedIfCompleted(status, row['Last Date Read']);

    const { rating, wasRounded } = roundAndClampRating(row['Star Rating']);
    if (wasRounded) {
      roundedRatingsCount += 1;
    }

    const noteText = (row['Review'] || '').trim();

    bookFields.push({
      title,
      author,
      isbn,
      // StoryGraph's export has no Publisher or page count column - these
      // two fields are always empty/null by design, not a bug.
      publisher: '',
      category: '',
      rating,
      pageCount: null,
      status,
      dateStarted: '',
      dateFinished,
      notesList: wrapNote(noteText),
    });
  });

  return { bookFields, skippedRows, roundedRatingsCount };
}
