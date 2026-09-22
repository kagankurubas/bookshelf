// Pure logic determining which books show on the Reading Recap card. Same
// rule as other reading stats: a book counts as "read" only if status is
// Tamamlandı AND date_finished is set (not when the record was added) -
// see the RPCs in supabase/schema.sql.
export const RECAP_COMPLETED_STATUS = 'Tamamlandı';

// Max spine count shown so the card doesn't overflow - the rest is
// summarized with a "+N more books" badge.
export const MAX_VISIBLE_SPINES = 24;

// dateFinished is a Postgres "date" field (e.g. "2026-09-14") - parsing it
// with new Date(...) can shift by a day depending on browser timezone (UTC
// midnight converted to local time can fall on the previous day). Reading
// year/month directly from the string avoids that shift.
function parseFinishedDate(dateFinished) {
  if (!dateFinished) return null;
  const [year, month] = dateFinished.split('-').map(Number);
  if (!year || !month) return null;
  return { year, month };
}

// mode: 'month' | 'year'. In 'month' mode both year and month must match,
// in 'year' mode only year.
export function getFinishedBooksInPeriod(books, mode, year, month) {
  return books.filter((book) => {
    if (book.status !== RECAP_COMPLETED_STATUS) return false;
    const parsed = parseFinishedDate(book.dateFinished);
    if (!parsed) return false;
    if (parsed.year !== year) return false;
    if (mode === 'month' && parsed.month !== month) return false;
    return true;
  });
}

// Year picker options: years with at least one actually-finished book
// (newest to oldest) - but the current year must be in the list even with
// no books, since the screen always opens on that year/month.
export function getRecapYearOptions(books, currentYear = new Date().getFullYear()) {
  const years = new Set([currentYear]);
  books.forEach((book) => {
    if (book.status !== RECAP_COMPLETED_STATUS) return;
    const parsed = parseFinishedDate(book.dateFinished);
    if (parsed) years.add(parsed.year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

// Limits the spines shown on the card to MAX_VISIBLE_SPINES, returning the
// rest as an overflow count.
export function splitForDisplay(books) {
  return {
    visible: books.slice(0, MAX_VISIBLE_SPINES),
    overflowCount: Math.max(0, books.length - MAX_VISIBLE_SPINES),
  };
}
