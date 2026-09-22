import { describe, it, expect } from 'vitest';
import { getFinishedBooksInPeriod, getRecapYearOptions, splitForDisplay, MAX_VISIBLE_SPINES } from './readingRecap';

const book = (overrides) => ({
  id: overrides.id ?? 'b1',
  status: 'Tamamlandı',
  dateFinished: '2026-09-14',
  ...overrides,
});

describe('getFinishedBooksInPeriod', () => {
  it('includes a book finished in the selected month/year in month mode', () => {
    const books = [book({ id: 'a', dateFinished: '2026-09-14' })];
    expect(getFinishedBooksInPeriod(books, 'month', 2026, 9)).toHaveLength(1);
  });

  it('excludes a book finished in a different month', () => {
    const books = [book({ id: 'a', dateFinished: '2026-08-14' })];
    expect(getFinishedBooksInPeriod(books, 'month', 2026, 9)).toHaveLength(0);
  });

  it('includes every month of the selected year in year mode', () => {
    const books = [
      book({ id: 'a', dateFinished: '2026-01-05' }),
      book({ id: 'b', dateFinished: '2026-12-30' }),
    ];
    expect(getFinishedBooksInPeriod(books, 'year', 2026, null)).toHaveLength(2);
  });

  it('excludes books from a different year in year mode', () => {
    const books = [book({ id: 'a', dateFinished: '2025-09-14' })];
    expect(getFinishedBooksInPeriod(books, 'year', 2026, null)).toHaveLength(0);
  });

  it('excludes books that are not Tamamlandı even if the date matches', () => {
    const books = [book({ id: 'a', status: 'Okunuyor' })];
    expect(getFinishedBooksInPeriod(books, 'month', 2026, 9)).toHaveLength(0);
  });

  it('excludes Tamamlandı books with no date_finished', () => {
    const books = [book({ id: 'a', dateFinished: '' })];
    expect(getFinishedBooksInPeriod(books, 'year', 2026, null)).toHaveLength(0);
  });

  it('does not shift a month-boundary date across a UTC/local timezone gap', () => {
    // If 2026-01-01 were parsed directly as a Date and converted to local
    // time, it could shift back to December 2025 in negative UTC-offset
    // timezones.
    const books = [book({ id: 'a', dateFinished: '2026-01-01' })];
    expect(getFinishedBooksInPeriod(books, 'month', 2026, 1)).toHaveLength(1);
    expect(getFinishedBooksInPeriod(books, 'month', 2025, 12)).toHaveLength(0);
  });
});

describe('getRecapYearOptions', () => {
  it('always includes the current year even with no data', () => {
    expect(getRecapYearOptions([], 2026)).toEqual([2026]);
  });

  it('includes years with finished books, sorted newest first', () => {
    const books = [
      book({ id: 'a', dateFinished: '2024-06-01' }),
      book({ id: 'b', dateFinished: '2025-06-01' }),
    ];
    expect(getRecapYearOptions(books, 2026)).toEqual([2026, 2025, 2024]);
  });

  it('deduplicates years and ignores non-Tamamlandı books', () => {
    const books = [
      book({ id: 'a', dateFinished: '2026-06-01' }),
      book({ id: 'b', dateFinished: '2026-01-01' }),
      book({ id: 'c', status: 'Okunuyor', dateFinished: '2020-01-01' }),
    ];
    expect(getRecapYearOptions(books, 2026)).toEqual([2026]);
  });
});

describe('splitForDisplay', () => {
  it('returns every book as visible with no overflow when under the cap', () => {
    const books = Array.from({ length: 5 }, (_, i) => book({ id: `b${i}` }));
    const { visible, overflowCount } = splitForDisplay(books);
    expect(visible).toHaveLength(5);
    expect(overflowCount).toBe(0);
  });

  it('caps visible books at MAX_VISIBLE_SPINES and counts the rest as overflow', () => {
    const books = Array.from({ length: MAX_VISIBLE_SPINES + 7 }, (_, i) => book({ id: `b${i}` }));
    const { visible, overflowCount } = splitForDisplay(books);
    expect(visible).toHaveLength(MAX_VISIBLE_SPINES);
    expect(overflowCount).toBe(7);
  });
});
