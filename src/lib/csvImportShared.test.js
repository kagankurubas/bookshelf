import { describe, it, expect } from 'vitest';
import { parseCsvRows, skipIfMalformedRow, getTitleOrSkip } from './csvImportShared';

const HEADER = 'Title,Author,Exclusive Shelf';
const alwaysMatches = () => true;

describe('parseCsvRows', () => {
  it('returns malformed for empty input', () => {
    expect(parseCsvRows('', alwaysMatches)).toEqual({ error: 'malformed' });
    expect(parseCsvRows('   ', alwaysMatches)).toEqual({ error: 'malformed' });
  });

  it('returns wrong-format when the expected-columns check fails', () => {
    const csv = [HEADER, 'A Book,Some Author,read'].join('\n');
    expect(parseCsvRows(csv, () => false)).toEqual({ error: 'wrong-format' });
  });

  it('returns rows/fields with an empty malformedRowIndices set for a clean file', () => {
    const csv = [HEADER, 'A Book,Some Author,read'].join('\n');
    const result = parseCsvRows(csv, alwaysMatches);

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    expect(result.malformedRowIndices).toBeInstanceOf(Set);
    expect(result.malformedRowIndices.size).toBe(0);
  });

  // Empirically verified: a header with 3 columns plus a data row with an
  // extra unescaped comma (4 fields) triggers Papa.parse's "TooManyFields"
  // (FieldMismatch) error, whose `row` uses the SAME indexing as
  // parsed.data (header excluded, 0-based data-row index) - proven directly
  // by this test.
  it('flags a row with a field-count mismatch (extra unescaped comma) as malformed, by its parsed.data index', () => {
    const csv = [
      HEADER,
      'Book One,Author One,read',
      'Book Two,Author Two,extra,read',
      'Book Three,Author Three,read',
    ].join('\n');

    const result = parseCsvRows(csv, alwaysMatches);

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(3);
    expect(result.malformedRowIndices.has(1)).toBe(true);
    expect(result.malformedRowIndices.size).toBe(1);
    // Other rows must not be flagged as malformed.
    expect(result.malformedRowIndices.has(0)).toBe(false);
    expect(result.malformedRowIndices.has(2)).toBe(false);
  });

  it('flags a row with too few fields (missing trailing column) as malformed', () => {
    const csv = [
      HEADER,
      'Book One,Author One,read',
      'Book Two,Author Two',
      'Book Three,Author Three,read',
    ].join('\n');

    const result = parseCsvRows(csv, alwaysMatches);

    expect(result.malformedRowIndices.has(1)).toBe(true);
    expect(result.malformedRowIndices.size).toBe(1);
  });
});

describe('skipIfMalformedRow', () => {
  it('pushes a malformed-row skip entry and returns true when the index is flagged', () => {
    const skippedRows = [];
    const malformedRowIndices = new Set([2]);

    expect(skipIfMalformedRow(2, malformedRowIndices, skippedRows)).toBe(true);
    expect(skippedRows).toEqual([{ index: 2, reason: 'malformed-row' }]);
  });

  it('returns false and pushes nothing when the index is not flagged', () => {
    const skippedRows = [];
    const malformedRowIndices = new Set([2]);

    expect(skipIfMalformedRow(0, malformedRowIndices, skippedRows)).toBe(false);
    expect(skippedRows).toEqual([]);
  });

  it('is safe to call with an undefined malformedRowIndices set', () => {
    const skippedRows = [];
    expect(skipIfMalformedRow(0, undefined, skippedRows)).toBe(false);
    expect(skippedRows).toEqual([]);
  });

  it('composes with getTitleOrSkip: a malformed row is skipped before the title check ever runs', () => {
    const skippedRows = [];
    const malformedRowIndices = new Set([0]);

    // Even if the malformed row's title field is also empty, the reason
    // must be reported as 'malformed-row', not 'missing-title'.
    if (!skipIfMalformedRow(0, malformedRowIndices, skippedRows)) {
      getTitleOrSkip('', 0, skippedRows);
    }

    expect(skippedRows).toEqual([{ index: 0, reason: 'malformed-row' }]);
  });
});
