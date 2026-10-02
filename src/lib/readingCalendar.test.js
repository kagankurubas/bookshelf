import { describe, it, expect, afterEach } from 'vitest';
import {
  buildReadingCalendar,
  countBooksSkippedForDates,
  getCalendarYearOptions,
  resolveCalendarCoverUrl,
} from './readingCalendar';

const completed = (id, dateStarted, dateFinished, rating = 0) => ({ id, status: 'Tamamlandı', dateStarted, dateFinished, rating });
const reading = (id, dateStarted) => ({ id, status: 'Okunuyor', dateStarted, dateFinished: '', rating: 0 });

const cells = (calendar) => calendar.weeks.flat();
const cellOn = (calendar, date) => cells(calendar).find((cell) => cell.date === date);
const idsOn = (calendar, date) => (cellOn(calendar, date).books ?? []).map((entry) => entry.book.id);

// September 2026 is in the past relative to this "today".
const PAST_TODAY = '2026-10-02';

describe('buildReadingCalendar grid', () => {
  it('starts weeks on Monday and pads a month that starts on Tuesday', () => {
    const calendar = buildReadingCalendar({ books: [], year: 2026, month: 9, today: PAST_TODAY });
    expect(calendar.weeks[0].map((cell) => cell.type)).toEqual(['outside', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
    expect(calendar.weeks[0][1].date).toBe('2026-09-01');
    expect(cells(calendar).filter((cell) => cell.date)).toHaveLength(30);
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('puts the 1st in the last column when the month starts on a Sunday', () => {
    const calendar = buildReadingCalendar({ books: [], year: 2026, month: 11, today: '2026-12-31' });
    expect(calendar.weeks[0].slice(0, 6).every((cell) => cell.type === 'outside')).toBe(true);
    expect(calendar.weeks[0][6].date).toBe('2026-11-01');
  });

  it('gives a leap-year February 29 days', () => {
    const calendar = buildReadingCalendar({ books: [], year: 2028, month: 2, today: '2028-03-01' });
    expect(cells(calendar).filter((cell) => cell.date).map((cell) => cell.day).at(-1)).toBe(29);
  });

  it('marks days after today as future only, and today itself is not future', () => {
    const calendar = buildReadingCalendar({ books: [], year: 2026, month: 10, today: PAST_TODAY });
    expect(cellOn(calendar, '2026-10-02').type).toBe('empty');
    expect(cellOn(calendar, '2026-10-03').type).toBe('future');
    expect(cellOn(calendar, '2026-10-31').type).toBe('future');
  });

  it('has no future days in a past month', () => {
    const calendar = buildReadingCalendar({ books: [], year: 2026, month: 9, today: PAST_TODAY });
    expect(cells(calendar).some((cell) => cell.type === 'future')).toBe(false);
  });
});

describe('buildReadingCalendar books', () => {
  it('fills every day of a completed book and rates only its finish day', () => {
    const calendar = buildReadingCalendar({ books: [completed('a', '2026-09-03', '2026-09-05', 4)], year: 2026, month: 9, today: PAST_TODAY });
    expect(cellOn(calendar, '2026-09-02').type).toBe('empty');
    expect(cellOn(calendar, '2026-09-03').books).toEqual([{ book: expect.objectContaining({ id: 'a' }), finished: false, rating: null }]);
    expect(cellOn(calendar, '2026-09-05').books[0]).toMatchObject({ finished: true, rating: 4 });
    expect(cellOn(calendar, '2026-09-06').type).toBe('empty');
  });

  it('shows no rating on the finish day of an unrated book', () => {
    const calendar = buildReadingCalendar({ books: [completed('a', '2026-09-03', '2026-09-05', 0)], year: 2026, month: 9, today: PAST_TODAY });
    expect(cellOn(calendar, '2026-09-05').books[0]).toMatchObject({ finished: true, rating: null });
  });

  it('skips completed books with a missing date or a start after the finish', () => {
    const books = [
      completed('no-start', '', '2026-09-05'),
      completed('no-finish', '2026-09-03', ''),
      completed('reversed', '2026-09-10', '2026-09-05'),
    ];
    const calendar = buildReadingCalendar({ books, year: 2026, month: 9, today: PAST_TODAY });
    expect(cells(calendar).some((cell) => cell.type === 'read')).toBe(false);
  });

  it('skips Yarıda Bırakıldı and Başlanmadı books even with dates', () => {
    const books = [
      { ...completed('dropped', '2026-09-03', '2026-09-05'), status: 'Yarıda Bırakıldı' },
      { ...completed('unstarted', '2026-09-03', '2026-09-05'), status: 'Başlanmadı' },
    ];
    const calendar = buildReadingCalendar({ books, year: 2026, month: 9, today: PAST_TODAY });
    expect(cells(calendar).some((cell) => cell.type === 'read')).toBe(false);
  });

  it('fills a book still being read up to today in the current month', () => {
    const calendar = buildReadingCalendar({ books: [reading('a', '2026-10-01')], year: 2026, month: 10, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-10-01')).toEqual(['a']);
    expect(idsOn(calendar, '2026-10-02')).toEqual(['a']);
    expect(cellOn(calendar, '2026-10-03').type).toBe('future');
  });

  it('fills a book still being read to the end of a past month', () => {
    const calendar = buildReadingCalendar({ books: [reading('a', '2026-09-20')], year: 2026, month: 9, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-09-19')).toEqual([]);
    expect(idsOn(calendar, '2026-09-20')).toEqual(['a']);
    expect(idsOn(calendar, '2026-09-30')).toEqual(['a']);
  });

  it('skips a book being read with no start date or a start after today', () => {
    const books = [reading('no-start', ''), reading('later', '2026-10-05')];
    const calendar = buildReadingCalendar({ books, year: 2026, month: 10, today: PAST_TODAY });
    expect(cells(calendar).some((cell) => cell.type === 'read')).toBe(false);
  });

  it('shows a book carried over from the previous month from the 1st', () => {
    const calendar = buildReadingCalendar({ books: [completed('a', '2026-08-25', '2026-09-03', 5)], year: 2026, month: 9, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-09-01')).toEqual(['a']);
    expect(cellOn(calendar, '2026-09-03').books[0]).toMatchObject({ finished: true, rating: 5 });
  });

  it('keeps a finished book on its finish day and starts a book begun that day on the next day', () => {
    const books = [completed('a', '2026-09-01', '2026-09-10', 3), completed('b', '2026-09-10', '2026-09-15')];
    const calendar = buildReadingCalendar({ books, year: 2026, month: 9, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-09-10')).toEqual(['a']);
    expect(idsOn(calendar, '2026-09-11')).toEqual(['b']);
  });

  it('does not move a book that starts and finishes on another book\'s finish day', () => {
    const books = [completed('a', '2026-09-01', '2026-09-10'), completed('b', '2026-09-10', '2026-09-10', 5)];
    const calendar = buildReadingCalendar({ books, year: 2026, month: 9, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-09-10')).toEqual(['a', 'b']);
    expect(idsOn(calendar, '2026-09-11')).toEqual([]);
  });

  it('lists books read in parallel, finished-that-day first, then by start date', () => {
    const books = [
      completed('late-start', '2026-09-05', '2026-09-20'),
      completed('early-start', '2026-09-02', '2026-09-20'),
      completed('ends-on-8', '2026-09-07', '2026-09-08', 2),
    ];
    const calendar = buildReadingCalendar({ books, year: 2026, month: 9, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-09-06')).toEqual(['early-start', 'late-start']);
    expect(idsOn(calendar, '2026-09-08')).toEqual(['ends-on-8', 'early-start', 'late-start']);
  });

  it('shows no covers on future days of the current month', () => {
    const calendar = buildReadingCalendar({ books: [completed('a', '2026-10-01', '2026-10-20')], year: 2026, month: 10, today: PAST_TODAY });
    expect(idsOn(calendar, '2026-10-02')).toEqual(['a']);
    expect(cellOn(calendar, '2026-10-03')).toEqual({ type: 'future', date: '2026-10-03', day: 3 });
  });
});

describe('buildReadingCalendar time zones', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('gives the same calendar regardless of the process time zone', () => {
    const books = [completed('a', '2026-09-01', '2026-09-01', 5), reading('b', '2026-09-30')];
    const build = () => buildReadingCalendar({ books, year: 2026, month: 9, today: PAST_TODAY });
    process.env.TZ = 'Pacific/Kiritimati';
    const ahead = build();
    process.env.TZ = 'Pacific/Pago_Pago';
    const behind = build();
    expect(ahead).toEqual(behind);
    expect(idsOn(ahead, '2026-09-01')).toEqual(['a']);
    expect(idsOn(ahead, '2026-09-30')).toEqual(['b']);
  });
});

describe('countBooksSkippedForDates', () => {
  it('counts books left off for missing or reversed dates, not for their status', () => {
    const books = [
      completed('ok', '2026-09-01', '2026-09-02'),
      completed('no-start', '', '2026-09-02'),
      completed('reversed', '2026-09-05', '2026-09-02'),
      reading('ok-reading', '2026-09-01'),
      reading('no-start-reading', ''),
      { ...completed('dropped', '', ''), status: 'Yarıda Bırakıldı' },
      { ...completed('unstarted', '', ''), status: 'Başlanmadı' },
    ];
    expect(countBooksSkippedForDates(books)).toBe(3);
  });
});

describe('getCalendarYearOptions', () => {
  it('offers the current year plus start and finish years, newest first, never a future year', () => {
    const books = [
      completed('a', '2023-12-20', '2024-01-05'),
      reading('b', '2021-06-01'),
      { ...completed('dropped', '2019-01-01', '2019-02-01'), status: 'Yarıda Bırakıldı' },
      completed('future', '2027-01-01', '2027-01-02'),
    ];
    expect(getCalendarYearOptions(books, 2026)).toEqual([2026, 2024, 2023, 2021]);
  });
});

describe('resolveCalendarCoverUrl', () => {
  it('uses the stored Open Library cover at M size', () => {
    expect(resolveCalendarCoverUrl({ coverImage: 'https://covers.openlibrary.org/b/id/123-L.jpg', isbn: '9780140328721' }))
      .toBe('https://covers.openlibrary.org/b/id/123-M.jpg?default=false');
  });

  it('keeps a stored cover from another host as is', () => {
    expect(resolveCalendarCoverUrl({ coverImage: 'https://example.com/cover.jpg' })).toBe('https://example.com/cover.jpg');
  });

  it('falls back to an Open Library ISBN cover when there is no stored cover', () => {
    expect(resolveCalendarCoverUrl({ coverImage: '', isbn: '978-0-14-032872-1' }))
      .toBe('https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg?default=false');
  });

  it('returns null with neither a cover nor an ISBN', () => {
    expect(resolveCalendarCoverUrl({ coverImage: '', isbn: '' })).toBeNull();
  });
});
