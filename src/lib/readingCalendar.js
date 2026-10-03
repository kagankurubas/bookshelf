// Pure logic behind the Reading Recap calendar style: which book(s) fill each
// day of a month. Reading dates are Postgres "date" values ('YYYY-MM-DD'), so
// they're handled as plain calendar days - parsed from the string and turned
// into UTC day numbers, never converted through the local time zone.
import { openLibraryCoverUrl } from './openLibrary';

const COMPLETED = 'Tamamlandı';
const READING = 'Okunuyor';
const MS_PER_DAY = 86400000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(value) {
  const match = typeof value === 'string' && value.match(DATE_PATTERN);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return ms / MS_PER_DAY;
}

function yearOf(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).getUTCFullYear();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

// The span a book covers before Rule 1 and month clipping, or null when the
// book doesn't belong on the calendar at all. A book still being read runs
// until today; clipping to the month later turns that into "until the end of
// the month" for past months.
function readingSpan(book, today) {
  const start = parseDay(book.dateStarted);
  if (book.status === COMPLETED) {
    const finish = parseDay(book.dateFinished);
    if (start === null || finish === null || start > finish) return null;
    return { book, start, end: finish, finish };
  }
  if (book.status === READING) {
    if (start === null || start > today) return null;
    return { book, start, end: today, finish: null };
  }
  return null;
}

// Rule 1: a book that starts on a day another book finished moves to the next
// day, unless that would push it past its own end (started and finished, or
// started today, on that same day).
function applyFinishDayPriority(spans) {
  const finishDays = new Map();
  spans.forEach((span) => {
    if (span.finish === null) return;
    finishDays.set(span.finish, [...(finishDays.get(span.finish) ?? []), span]);
  });
  return spans.map((span) => {
    const finishedThatDay = (finishDays.get(span.start) ?? []).some((other) => other !== span);
    if (!finishedThatDay || span.start + 1 > span.end) return span;
    return { ...span, shownFrom: span.start + 1 };
  });
}

function compareEntries(a, b) {
  if (a.finished !== b.finished) return a.finished ? -1 : 1;
  if (a.startDay !== b.startDay) return a.startDay - b.startDay;
  return String(a.book.id).localeCompare(String(b.book.id));
}

// Monday-first month grid. Each cell is one of:
//   { type: 'outside' }                          padding before/after the month
//   { type: 'future', date, day }                after today
//   { type: 'empty', date, day }                 nothing read that day
//   { type: 'read', date, day, books: [...] }    { book, finished, rating } entries,
//                                                finished-that-day first;
//                                                rating is null unless finished and rated
// `today` is the caller's local 'YYYY-MM-DD'.
export function buildReadingCalendar({ books, year, month, today }) {
  const todayDay = parseDay(today);
  if (todayDay === null) throw new Error(`buildReadingCalendar: invalid today "${today}"`);

  const firstDay = Date.UTC(year, month - 1, 1) / MS_PER_DAY;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (new Date(firstDay * MS_PER_DAY).getUTCDay() + 6) % 7;

  const spans = applyFinishDayPriority(books.map((book) => readingSpan(book, todayDay)).filter(Boolean));

  const cells = Array.from({ length: leading }, () => ({ type: 'outside' }));
  for (let day = 1; day <= daysInMonth; day++) {
    const dayNumber = firstDay + day - 1;
    const date = `${year}-${pad2(month)}-${pad2(day)}`;
    if (dayNumber > todayDay) {
      cells.push({ type: 'future', date, day });
      continue;
    }
    const entries = spans
      .filter((span) => (span.shownFrom ?? span.start) <= dayNumber && dayNumber <= span.end)
      .map((span) => {
        const finished = span.finish === dayNumber;
        const rating = finished && span.book.rating > 0 ? span.book.rating : null;
        return { book: span.book, finished, rating, startDay: span.start };
      })
      .sort(compareEntries)
      .map(({ book, finished, rating }) => ({ book, finished, rating }));
    cells.push(entries.length ? { type: 'read', date, day, books: entries } : { type: 'empty', date, day });
  }
  while (cells.length % 7 !== 0) cells.push({ type: 'outside' });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, weeks };
}

// Books left off the calendar because of missing or inconsistent dates (not
// because of their status) - counted across the whole library, since a book
// without dates can't be placed in any month.
export function countBooksSkippedForDates(books) {
  return books.filter((book) => {
    const start = parseDay(book.dateStarted);
    if (book.status === COMPLETED) {
      const finish = parseDay(book.dateFinished);
      return start === null || finish === null || start > finish;
    }
    if (book.status === READING) return start === null;
    return false;
  }).length;
}

// Years offered by the calendar's year picker, newest first: the current year
// plus any year a book was finished, or a Okunuyor/Tamamlandı book was started.
// Future years are left out since future months can't be picked.
export function getCalendarYearOptions(books, currentYear) {
  const years = new Set([currentYear]);
  books.forEach((book) => {
    if (book.status !== COMPLETED && book.status !== READING) return;
    const start = parseDay(book.dateStarted);
    if (start !== null) years.add(yearOf(start));
    if (book.status === COMPLETED) {
      const finish = parseDay(book.dateFinished);
      if (finish !== null) years.add(yearOf(finish));
    }
  });
  return Array.from(years).filter((year) => year <= currentYear).sort((a, b) => b - a);
}

// Cover URL for a calendar cell: the stored cover (Open Library ones at M
// size), else an Open Library cover looked up by ISBN, else null.
export function resolveCalendarCoverUrl(book) {
  const stored = typeof book.coverImage === 'string' ? book.coverImage.trim() : '';
  if (stored) return openLibraryCoverUrl(stored, 'M');
  const isbn = String(book.isbn ?? '').replace(/[^0-9Xx]/g, '');
  if (!isbn) return null;
  return openLibraryCoverUrl(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`);
}
