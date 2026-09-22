import { describe, it, expect } from 'vitest';
import { parseGoodreadsCsv } from './goodreadsImport';

const HEADER =
  'Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,' +
  'Average Rating,Publisher,Binding,Number of Pages,Year Published,' +
  'Original Publication Year,Date Read,Date Added,Bookshelves,' +
  'Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,' +
  'Read Count,Recommended For,Recommended By,Owned Copies,Original Purchase Date,' +
  'Original Purchase Location,Condition,Condition Description,BCID';

function row({
  bookId = '1',
  title = 'Fahrenheit 451',
  author = 'Ray Bradbury',
  authorLf = 'Bradbury, Ray',
  additionalAuthors = '',
  isbn = '',
  isbn13 = '="9781451673319"',
  myRating = '5',
  avgRating = '4.0',
  publisher = 'Simon & Schuster',
  binding = 'Paperback',
  numPages = '256',
  yearPublished = '1953',
  origPubYear = '1953',
  dateRead = '2023/06/01',
  dateAdded = '2023/05/01',
  bookshelves = '',
  bookshelvesPositions = '',
  exclusiveShelf = 'read',
  myReview = '',
  spoiler = '',
  privateNotes = '',
  readCount = '1',
  recFor = '',
  recBy = '',
  ownedCopies = '0',
  origPurchaseDate = '',
  origPurchaseLoc = '',
  condition = '',
  conditionDesc = '',
  bcid = '',
} = {}) {
  return [
    bookId, title, author, authorLf, additionalAuthors, isbn, isbn13, myRating,
    avgRating, publisher, binding, numPages, yearPublished, origPubYear,
    dateRead, dateAdded, bookshelves, bookshelvesPositions, exclusiveShelf,
    myReview, spoiler, privateNotes, readCount, recFor, recBy, ownedCopies,
    origPurchaseDate, origPurchaseLoc, condition, conditionDesc, bcid,
  ]
    .map((v) => (v.includes(',') ? `"${v}"` : v))
    .join(',');
}

function buildCsv(rows) {
  return [HEADER, ...rows].join('\n');
}

describe('parseGoodreadsCsv', () => {
  it('maps a fully-populated "read" row to BookShelf bookFields', () => {
    const csv = buildCsv([row()]);
    const result = parseGoodreadsCsv(csv);

    expect(result.error).toBeUndefined();
    expect(result.bookFields).toHaveLength(1);
    expect(result.bookFields[0]).toMatchObject({
      title: 'Fahrenheit 451',
      author: 'Ray Bradbury',
      isbn: '9781451673319',
      publisher: 'Simon & Schuster',
      rating: 5,
      pageCount: 256,
      status: 'Tamamlandı',
      dateFinished: '2023/06/01',
      dateStarted: '',
      category: '',
    });
  });

  it('strips the Excel ="..." wrapper from ISBN13', () => {
    const csv = buildCsv([row({ isbn13: '="9780000000002"' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].isbn).toBe('9780000000002');
  });

  it('falls back to ISBN when ISBN13 is empty, also unwrapping it', () => {
    const csv = buildCsv([row({ isbn13: '', isbn: '="0000000001"' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].isbn).toBe('0000000001');
  });

  it('combines Author and Additional Authors', () => {
    const csv = buildCsv([row({ additionalAuthors: 'Someone Else' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].author).toBe('Ray Bradbury, Someone Else');
  });

  it('maps Exclusive Shelf to the correct BookShelf status', () => {
    const cases = [
      ['read', 'Tamamlandı'],
      ['currently-reading', 'Okunuyor'],
      ['to-read', 'Başlanmadı'],
    ];
    for (const [shelf, expectedStatus] of cases) {
      const csv = buildCsv([row({ exclusiveShelf: shelf })]);
      const result = parseGoodreadsCsv(csv);
      expect(result.bookFields[0].status).toBe(expectedStatus);
    }
  });

  it('falls back to Başlanmadı for an unrecognized or empty shelf value', () => {
    const csv = buildCsv([row({ exclusiveShelf: 'some-custom-shelf' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].status).toBe('Başlanmadı');

    const csvEmpty = buildCsv([row({ exclusiveShelf: '' })]);
    const resultEmpty = parseGoodreadsCsv(csvEmpty);
    expect(resultEmpty.bookFields[0].status).toBe('Başlanmadı');
  });

  it('only sets dateFinished when status is Tamamlandı (read)', () => {
    const csv = buildCsv([row({ exclusiveShelf: 'to-read', dateRead: '2023/06/01' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].dateFinished).toBe('');
  });

  it('prefers My Review over Private Notes for the note text, when both are present', () => {
    const csv = buildCsv([row({ myReview: 'Loved it', privateNotes: 'reread later' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].notesList).toEqual([{ text: 'Loved it' }]);
  });

  it('falls back to Private Notes when My Review is empty', () => {
    const csv = buildCsv([row({ myReview: '', privateNotes: 'reread later' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].notesList).toEqual([{ text: 'reread later' }]);
  });

  it('produces no notesList entry when both review fields are empty', () => {
    const csv = buildCsv([row({ myReview: '', privateNotes: '' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].notesList).toEqual([]);
  });

  it('skips rows with a missing title and reports the reason', () => {
    const csv = buildCsv([row({ title: '' }), row({ title: 'Valid Book' })]);
    const result = parseGoodreadsCsv(csv);

    expect(result.bookFields).toHaveLength(1);
    expect(result.bookFields[0].title).toBe('Valid Book');
    expect(result.skippedRows).toEqual([{ index: 0, reason: 'missing-title' }]);
  });

  // Verifies parseCsvRows catches Papa.parse's own error list (result.errors)
  // and adds a 'malformed-row' entry to skippedRows. An extra unescaped
  // comma produces a field count (32) mismatched against the header (31
  // columns), which triggers a real Papa.parse "TooManyFields" error (see
  // csvImportShared.test.js).
  it('skips a row with a field-count mismatch (malformed row) and does not produce a garbage book entry', () => {
    const goodRow1 = row({ title: 'Book One' });
    const malformedRow = row({ title: 'Book Two' }) + ',extra-unescaped-field';
    const goodRow2 = row({ title: 'Book Three' });
    const csv = buildCsv([goodRow1, malformedRow, goodRow2]);

    const result = parseGoodreadsCsv(csv);

    expect(result.error).toBeUndefined();
    expect(result.bookFields).toHaveLength(2);
    expect(result.bookFields.map((b) => b.title)).toEqual(['Book One', 'Book Three']);
    expect(result.skippedRows).toEqual([{ index: 1, reason: 'malformed-row' }]);
  });

  it('treats an unparseable rating/page count as a safe default instead of throwing', () => {
    const csv = buildCsv([row({ myRating: '', numPages: '' })]);
    const result = parseGoodreadsCsv(csv);
    expect(result.bookFields[0].rating).toBe(0);
    expect(result.bookFields[0].pageCount).toBeNull();
  });

  it('returns a wrong-format error when the header does not look like a Goodreads export', () => {
    const csv = 'Name,Email\nAlice,alice@example.com';
    const result = parseGoodreadsCsv(csv);
    expect(result.error).toBe('wrong-format');
    expect(result.bookFields).toBeUndefined();
  });

  it('returns a malformed error for empty input', () => {
    expect(parseGoodreadsCsv('').error).toBe('malformed');
    expect(parseGoodreadsCsv('   ').error).toBe('malformed');
  });
});
