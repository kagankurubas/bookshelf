import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { buildBooksCsv, buildBooksJson, getExportFilename } from './bookExport';

const libraryNameById = { 'lib-1': 'Ana Kitaplık', 'lib-2': 'Bilim Kurgu Rafı' };

const baseBook = {
  id: 'book-1',
  title: 'Dune',
  author: 'Frank Herbert',
  publisher: 'Chilton Books',
  category: 'Bilim Kurgu',
  status: 'Tamamlandı',
  rating: 5,
  isbn: '9780441013593',
  pageCount: 412,
  isFavorite: true,
  dateStarted: '2026-01-01',
  dateFinished: '2026-01-20',
  createdAt: '2026-01-01T10:00:00.000Z',
  libraryIds: ['lib-1', 'lib-2'],
  notesList: [
    { text: 'İlk okuyuşta harikaydı', date: '1 Ocak 2026' },
    { text: 'İkinci okuyuş', date: '5 Ocak 2026' },
  ],
  // UI-only alanlar - export'a dahil edilmemeli
  coverImage: 'https://example.com/cover.jpg',
  coverPosition: 60,
  shelfId: 'lib-1',
  shelfRow: 2,
  slotIndex: 3,
};

describe('buildBooksCsv', () => {
  it('maps the expected fields and joins library names with "; "', () => {
    const csv = buildBooksCsv([baseBook], libraryNameById);
    const { data } = Papa.parse(csv, { header: true });

    expect(data).toHaveLength(1);
    const row = data[0];
    expect(row.title).toBe('Dune');
    expect(row.author).toBe('Frank Herbert');
    expect(row.publisher).toBe('Chilton Books');
    expect(row.category).toBe('Bilim Kurgu');
    expect(row.status).toBe('Tamamlandı');
    expect(row.rating).toBe('5');
    expect(row.isbn).toBe('9780441013593');
    expect(row.pageCount).toBe('412');
    expect(row.isFavorite).toBe('true');
    expect(row.dateStarted).toBe('2026-01-01');
    expect(row.dateFinished).toBe('2026-01-20');
    expect(row.createdAt).toBe('2026-01-01T10:00:00.000Z');
    expect(row.libraries).toBe('Ana Kitaplık; Bilim Kurgu Rafı');
  });

  it('joins note texts with "\\n---\\n" in a single column', () => {
    const csv = buildBooksCsv([baseBook], libraryNameById);
    const { data } = Papa.parse(csv, { header: true });

    expect(data[0].notes).toBe('İlk okuyuşta harikaydı\n---\nİkinci okuyuş');
  });

  it('does not include UI-only fields', () => {
    const csv = buildBooksCsv([baseBook], libraryNameById);
    expect(csv).not.toMatch(/coverImage|coverPosition|shelfId|shelfRow|slotIndex/);
  });

  it('correctly escapes a title containing a comma', () => {
    const book = { ...baseBook, title: 'Kürk Mantolu Madonna, Genişletilmiş Baskı' };
    const csv = buildBooksCsv([book], libraryNameById);
    const { data, errors } = Papa.parse(csv, { header: true });

    expect(errors).toHaveLength(0);
    expect(data[0].title).toBe('Kürk Mantolu Madonna, Genişletilmiş Baskı');
  });

  it('correctly escapes a note containing an embedded newline', () => {
    const book = {
      ...baseBook,
      notesList: [{ text: 'Birinci satır\nİkinci satır', date: '1 Ocak 2026' }],
    };
    const csv = buildBooksCsv([book], libraryNameById);
    const { data, errors } = Papa.parse(csv, { header: true });

    expect(errors).toHaveLength(0);
    expect(data[0].notes).toBe('Birinci satır\nİkinci satır');
  });

  it('leaves the libraries column empty when the book has no libraries', () => {
    const book = { ...baseBook, libraryIds: [] };
    const csv = buildBooksCsv([book], libraryNameById);
    const { data } = Papa.parse(csv, { header: true });

    expect(data[0].libraries).toBe('');
  });

  it('returns a header-only CSV for an empty book list', () => {
    const csv = buildBooksCsv([], libraryNameById);
    const { data } = Papa.parse(csv, { header: true });
    expect(data).toEqual([]);
  });
});

describe('buildBooksJson', () => {
  it('maps the expected fields, keeps library names as an array, and preserves notesList structure', () => {
    const json = buildBooksJson([baseBook], libraryNameById);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    const row = parsed[0];
    expect(row.title).toBe('Dune');
    expect(row.author).toBe('Frank Herbert');
    expect(row.publisher).toBe('Chilton Books');
    expect(row.category).toBe('Bilim Kurgu');
    expect(row.status).toBe('Tamamlandı');
    expect(row.rating).toBe(5);
    expect(row.isbn).toBe('9780441013593');
    expect(row.pageCount).toBe(412);
    expect(row.isFavorite).toBe(true);
    expect(row.dateStarted).toBe('2026-01-01');
    expect(row.dateFinished).toBe('2026-01-20');
    expect(row.createdAt).toBe('2026-01-01T10:00:00.000Z');
    expect(row.libraries).toEqual(['Ana Kitaplık', 'Bilim Kurgu Rafı']);
    expect(row.notes).toEqual([
      { text: 'İlk okuyuşta harikaydı', date: '1 Ocak 2026' },
      { text: 'İkinci okuyuş', date: '5 Ocak 2026' },
    ]);
  });

  it('does not include UI-only fields', () => {
    const json = buildBooksJson([baseBook], libraryNameById);
    expect(json).not.toMatch(/coverImage|coverPosition|shelfId|shelfRow|slotIndex/);
  });

  it('returns an empty array for an empty book list', () => {
    expect(JSON.parse(buildBooksJson([], libraryNameById))).toEqual([]);
  });
});

describe('getExportFilename', () => {
  it('formats the filename as bookshelf-export-YYYY-MM-DD.<extension>', () => {
    const date = new Date(2026, 0, 5); // 5 Ocak 2026 (local)
    expect(getExportFilename('csv', date)).toBe('bookshelf-export-2026-01-05.csv');
    expect(getExportFilename('json', date)).toBe('bookshelf-export-2026-01-05.json');
  });

  it('pads single-digit months and days with a leading zero', () => {
    const date = new Date(2026, 8, 9);
    expect(getExportFilename('csv', date)).toBe('bookshelf-export-2026-09-09.csv');
  });
});
