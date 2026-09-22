import Papa from 'papaparse';

// Common skeleton shared by the Goodreads and StoryGraph parsers
// (goodreadsImport.js / storygraphImport.js): Papa.parse-based parsing,
// empty-input/empty-field/wrong-format guards, missing-title row skipping,
// the "only fill dateFinished when Completed" rule, and note->notesList
// wrapping. Platform-specific logic (column names, extra status values,
// ISBN unwrap, rating rounding) is deliberately kept out of here, in each
// platform's own file.

// The three statuses both platforms map the same way. Platform-specific
// extra statuses (e.g. StoryGraph's "did-not-finish" -> "Yarıda Bırakıldı")
// extend this with { ...BASE_STATUS_MAP, ... } in their own file.
export const BASE_STATUS_MAP = {
  read: 'Tamamlandı',
  'currently-reading': 'Okunuyor',
  'to-read': 'Başlanmadı',
};
export const DEFAULT_STATUS = 'Başlanmadı';
export const COMPLETED_STATUS = 'Tamamlandı';

// Parses raw CSV text with Papa.parse and runs the shared guard/format
// detection logic: empty input, empty parse result, unexpected columns.
// hasExpectedColumns(fields): returns whether this platform's format is
// recognized (true/false) - platforms needing extra checks (e.g.
// StoryGraph) can do so inside this callback.
//
// Return value is one of two shapes:
//  - { error: 'malformed' | 'wrong-format' }
//  - { rows: [...], fields: [...], malformedRowIndices: Set<number> }
//
// malformedRowIndices: row indices derived from Papa.parse's own
// result.errors array that have a row-level error (e.g. a field count
// mismatch against the header - TooManyFields/TooFewFields, or an unclosed
// quote - MissingQuotes). These indices use the SAME indexing as `rows`
// (i.e. parsed.data) - Papa.parse's error.row is equal to the data row's
// position in parsed.data with the header row excluded (verified
// empirically, see csvImportShared.test.js). Callers
// (goodreadsImport.js/storygraphImport.js) can use this set to skip a row
// before even starting to map it - see skipIfMalformedRow.
export function parseCsvRows(csvText, hasExpectedColumns) {
  if (!csvText || !csvText.trim()) {
    return { error: 'malformed' };
  }

  const parsed = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta?.fields || [];
  if (fields.length === 0) {
    return { error: 'malformed' };
  }

  if (!hasExpectedColumns(fields)) {
    return { error: 'wrong-format' };
  }

  const malformedRowIndices = new Set(
    (parsed.errors || [])
      .filter((err) => typeof err.row === 'number')
      .map((err) => err.row)
  );

  return { rows: parsed.data, fields, malformedRowIndices };
}

// Shared check for skipping a row caught by Papa.parse's row-level error
// (see parseCsvRows' malformedRowIndices) - same pattern as getTitleOrSkip:
// if the row is malformed, pushes 'malformed-row' onto skippedRows and
// returns true (caller must stop mapping this row). Callers must call this
// BEFORE getTitleOrSkip - a malformed row's shifted/missing fields could
// otherwise get skipped for the wrong reason ("missing title") when the
// real reason is that the row itself is malformed.
export function skipIfMalformedRow(index, malformedRowIndices, skippedRows) {
  if (malformedRowIndices && malformedRowIndices.has(index)) {
    skippedRows.push({ index, reason: 'malformed-row' });
    return true;
  }
  return false;
}

// Shared check for skipping a row with an empty title - same behavior for
// both Goodreads and StoryGraph: pushes 'missing-title' onto skippedRows
// and returns null (caller must stop processing this row).
export function getTitleOrSkip(rawTitle, index, skippedRows) {
  const title = (rawTitle || '').trim();
  if (!title) {
    skippedRows.push({ index, reason: 'missing-title' });
    return null;
  }
  return title;
}

// dateFinished is only filled when status is "Tamamlandı" (Completed) -
// both platforms follow this rule (e.g. dateFinished stays empty for
// "Yarıda Bırakıldı" or "Okunuyor").
export function getDateFinishedIfCompleted(status, rawDate) {
  return status === COMPLETED_STATUS ? (rawDate || '').trim() : '';
}

// Wraps raw note text into bookFields' notesList shape - returns an empty
// array when empty/undefined.
export function wrapNote(noteText) {
  const trimmed = (noteText || '').trim();
  return trimmed ? [{ text: trimmed }] : [];
}
