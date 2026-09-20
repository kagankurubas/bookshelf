import { describe, it, expect } from 'vitest';
import { parseStoryGraphCsv } from './storygraphImport';

// Gercek StoryGraph export basligi (dogrulanmis kaynak: github.com/mateusz-bak/
// openreads issue #525). Okuma-durumu sutununun adi "Read Status" (iki
// kelime) - bkz. buildCsv/buildCsvWithReadStatusHeader ayrimi asagida, tek
// kelimeli "ReadStatus" varyasyonunu da ayrica test ediyoruz.
const HEADER =
  'Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,' +
  'Last Date Read,Dates Read,Read Count,Moods,Pace,' +
  'Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,' +
  'Diverse Characters?,Flawed Characters?,Star Rating,Review,Content Warnings,' +
  'Content Warning Description,Tags,Owned?';

const HEADER_READSTATUS_VARIANT = HEADER.replace('Read Status', 'ReadStatus');

function row({
  title = 'The Fifth Season',
  authors = 'N.K. Jemisin',
  contributors = '',
  isbnUid = '9780316229296',
  format = 'Physical Book',
  readStatus = 'read',
  dateAdded = '2023/01/01',
  lastDateRead = '2023/02/01',
  datesRead = '2023/01/15-2023/02/01',
  readCount = '1',
  moods = '',
  pace = '',
  charOrPlot = '',
  strongCharDev = '',
  loveableChars = '',
  diverseChars = '',
  flawedChars = '',
  starRating = '5',
  review = '',
  contentWarnings = '',
  contentWarningDesc = '',
  tags = '',
  owned = '',
} = {}) {
  return [
    title, authors, contributors, isbnUid, format, readStatus, dateAdded,
    lastDateRead, datesRead, readCount, moods, pace, charOrPlot, strongCharDev,
    loveableChars, diverseChars, flawedChars, starRating, review,
    contentWarnings, contentWarningDesc, tags, owned,
  ]
    .map((v) => (v.includes(',') ? `"${v}"` : v))
    .join(',');
}

function buildCsv(rows, header = HEADER) {
  return [header, ...rows].join('\n');
}

describe('parseStoryGraphCsv', () => {
  it('maps a fully-populated "read" row to BookShelf bookFields', () => {
    const csv = buildCsv([row()]);
    const result = parseStoryGraphCsv(csv);

    expect(result.error).toBeUndefined();
    expect(result.bookFields).toHaveLength(1);
    expect(result.bookFields[0]).toMatchObject({
      title: 'The Fifth Season',
      author: 'N.K. Jemisin',
      isbn: '9780316229296',
      publisher: '',
      pageCount: null,
      category: '',
      dateStarted: '',
      rating: 5,
      status: 'Tamamlandı',
      dateFinished: '2023/02/01',
    });
    expect(result.roundedRatingsCount).toBe(0);
  });

  it('maps all four read-status values to the correct BookShelf status, including did-not-finish', () => {
    const cases = [
      ['read', 'Tamamlandı'],
      ['currently-reading', 'Okunuyor'],
      ['to-read', 'Başlanmadı'],
      ['did-not-finish', 'Yarıda Bırakıldı'],
    ];
    for (const [readStatus, expectedStatus] of cases) {
      const csv = buildCsv([row({ readStatus })]);
      const result = parseStoryGraphCsv(csv);
      expect(result.bookFields[0].status).toBe(expectedStatus);
    }
  });

  it('falls back to Başlanmadı for an unrecognized or empty read-status value', () => {
    const csv = buildCsv([row({ readStatus: 'some-custom-status' })]);
    const result = parseStoryGraphCsv(csv);
    expect(result.bookFields[0].status).toBe('Başlanmadı');

    const csvEmpty = buildCsv([row({ readStatus: '' })]);
    const resultEmpty = parseStoryGraphCsv(csvEmpty);
    expect(resultEmpty.bookFields[0].status).toBe('Başlanmadı');
  });

  it('only sets dateFinished when status is Tamamlandı (read)', () => {
    const csv = buildCsv([row({ readStatus: 'to-read', lastDateRead: '2023/02/01' })]);
    const result = parseStoryGraphCsv(csv);
    expect(result.bookFields[0].dateFinished).toBe('');
  });

  it('rounds fractional star ratings to the nearest whole number and clamps to 0-5', () => {
    const cases = [
      ['4.25', 4],
      ['3.5', 4],
      ['4.75', 5],
      ['5', 5],
      ['0', 0],
    ];
    for (const [starRating, expectedRating] of cases) {
      const csv = buildCsv([row({ starRating })]);
      const result = parseStoryGraphCsv(csv);
      expect(result.bookFields[0].rating).toBe(expectedRating);
    }
  });

  it('tracks how many rows had their rating rounded (i.e. raw value was not already a whole number)', () => {
    const csv = buildCsv([
      row({ starRating: '4.25' }), // rounded
      row({ starRating: '3.5' }), // rounded
      row({ starRating: '5' }), // already whole - not counted
      row({ starRating: '' }), // no rating - not counted
    ]);
    const result = parseStoryGraphCsv(csv);
    expect(result.roundedRatingsCount).toBe(2);
  });

  it('treats an unparseable rating as a safe default instead of throwing', () => {
    const csv = buildCsv([row({ starRating: 'not-a-number' })]);
    const result = parseStoryGraphCsv(csv);
    expect(result.bookFields[0].rating).toBe(0);
    expect(result.roundedRatingsCount).toBe(0);
  });

  it('leaves publisher and pageCount empty/null - StoryGraph exports have no such columns', () => {
    const csv = buildCsv([row()]);
    const result = parseStoryGraphCsv(csv);
    expect(result.bookFields[0].publisher).toBe('');
    expect(result.bookFields[0].pageCount).toBeNull();
  });

  it('maps a non-empty Review to a single note', () => {
    const csv = buildCsv([row({ review: 'Loved the world-building' })]);
    const result = parseStoryGraphCsv(csv);
    expect(result.bookFields[0].notesList).toEqual([{ text: 'Loved the world-building' }]);
  });

  it('produces no notesList entry when Review is empty', () => {
    const csv = buildCsv([row({ review: '' })]);
    const result = parseStoryGraphCsv(csv);
    expect(result.bookFields[0].notesList).toEqual([]);
  });

  it('skips rows with a missing title and reports the reason, still processing the rest of the file', () => {
    const csv = buildCsv([row({ title: '' }), row({ title: 'Valid Book' })]);
    const result = parseStoryGraphCsv(csv);

    expect(result.bookFields).toHaveLength(1);
    expect(result.bookFields[0].title).toBe('Valid Book');
    expect(result.skippedRows).toEqual([{ index: 0, reason: 'missing-title' }]);
  });

  // Fazladan kacissiz bir virgul, baslikla (23 sutun) uyusmayan bir alan
  // sayisi uretiyor - Papa.parse bunu "TooManyFields" hatasi olarak
  // isaretliyor (bkz. csvImportShared.test.js icin empirik dogrulama).
  it('skips a row with a field-count mismatch (malformed row) and does not produce a garbage book entry', () => {
    const goodRow1 = row({ title: 'Book One' });
    const malformedRow = row({ title: 'Book Two' }) + ',extra-unescaped-field';
    const goodRow2 = row({ title: 'Book Three' });
    const csv = buildCsv([goodRow1, malformedRow, goodRow2]);

    const result = parseStoryGraphCsv(csv);

    expect(result.error).toBeUndefined();
    expect(result.bookFields).toHaveLength(2);
    expect(result.bookFields.map((b) => b.title)).toEqual(['Book One', 'Book Three']);
    expect(result.skippedRows).toEqual([{ index: 1, reason: 'malformed-row' }]);
  });

  it('tolerates the "ReadStatus" (single-word) header variant in addition to "Read Status"', () => {
    const csv = buildCsv([row({ readStatus: 'did-not-finish' })], HEADER_READSTATUS_VARIANT);
    const result = parseStoryGraphCsv(csv);

    expect(result.error).toBeUndefined();
    expect(result.bookFields[0].status).toBe('Yarıda Bırakıldı');
  });

  it('returns a wrong-format error when the header does not look like a StoryGraph export', () => {
    const csv = 'Name,Email\nAlice,alice@example.com';
    const result = parseStoryGraphCsv(csv);
    expect(result.error).toBe('wrong-format');
    expect(result.bookFields).toBeUndefined();
  });

  it('returns a wrong-format error when Title/Authors are present but no read-status column exists', () => {
    const csv = 'Title,Authors,Star Rating\nThe Fifth Season,N.K. Jemisin,5';
    const result = parseStoryGraphCsv(csv);
    expect(result.error).toBe('wrong-format');
  });

  it('returns a malformed error for empty input', () => {
    expect(parseStoryGraphCsv('').error).toBe('malformed');
    expect(parseStoryGraphCsv('   ').error).toBe('malformed');
  });
});
