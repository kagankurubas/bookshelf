import {
  parseCsvRows,
  getTitleOrSkip,
  getDateFinishedIfCompleted,
  wrapNote,
  skipIfMalformedRow,
  BASE_STATUS_MAP,
  DEFAULT_STATUS,
} from './csvImportShared';

// Goodreads'in gercek export basligindaki, formati taniyip tanimadigimizi
// anlamak icin kontrol ettigimiz sutunlar - hepsi bulunmali. Kaynak: bkz.
// arastirma notlari (gist.github.com/tmcw/f077b2f174a0194f62b94bec4e88f4d0
// ile dogrulanmis gercek Goodreads export basligi).
const EXPECTED_GOODREADS_COLUMNS = ['Title', 'Author', 'Exclusive Shelf'];

// Goodreads'in "Exclusive Shelf" degerleri -> BookShelf'in Turkce durum
// adlarina eslemesi. Goodreads'in "yarida birakildi" kavramі yok - tanimayan/
// bos deger Baslanmadi'ya duser. Ortak uc durum csvImportShared'dan geliyor.
const SHELF_TO_STATUS = { ...BASE_STATUS_MAP };

// Goodreads, ISBN/ISBN13 sutunlarini Excel'in basindaki sifirlari/uzun sayiyi
// bozmamasi icin ="1234567890123" seklinde bir Excel formulu olarak
// sarmalayarak export eder - bu sarmalayiciyi temizliyoruz.
function stripIsbnWrapper(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return '';
  const match = value.match(/^="?([^"]*)"?$/);
  return match ? match[1].trim() : value;
}

function parseIntOrDefault(rawValue, fallback) {
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseIntOrNull(rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') return null;
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function firstNonEmpty(...values) {
  return values.find((v) => v && v.trim().length > 0);
}

// Ham Goodreads CSV metnini alip BookShelf'in bookFields sekline (bkz.
// useBooks.js -> mapBookRow/addBook) esler. Supabase/DOM bagimliligi yok -
// saf fonksiyon, mocksuz test edilebilir.
//
// Donus degeri iki sekilden biri:
//  - { error: 'malformed' | 'wrong-format' }  -> hicbir satir islenmedi
//  - { bookFields: [...], skippedRows: [...] } -> basarili (kismen atlanmis olabilir)
export function parseGoodreadsCsv(csvText) {
  const parseResult = parseCsvRows(csvText, (fields) =>
    EXPECTED_GOODREADS_COLUMNS.every((col) => fields.includes(col))
  );
  if (parseResult.error) {
    return parseResult;
  }

  const bookFields = [];
  const skippedRows = [];

  parseResult.rows.forEach((row, index) => {
    if (skipIfMalformedRow(index, parseResult.malformedRowIndices, skippedRows)) return;

    const title = getTitleOrSkip(row['Title'], index, skippedRows);
    if (title === null) return;

    const author = [row['Author'], row['Additional Authors']]
      .filter((a) => a && a.trim())
      .join(', ');

    const isbn = firstNonEmpty(stripIsbnWrapper(row['ISBN13']), stripIsbnWrapper(row['ISBN'])) || '';

    const shelf = (row['Exclusive Shelf'] || '').trim();
    const status = SHELF_TO_STATUS[shelf] || DEFAULT_STATUS;

    const dateFinished = getDateFinishedIfCompleted(status, row['Date Read']);

    const noteText = firstNonEmpty(row['My Review'], row['Private Notes']);

    bookFields.push({
      title,
      author,
      isbn,
      publisher: (row['Publisher'] || '').trim(),
      category: '',
      rating: parseIntOrDefault(row['My Rating'], 0),
      pageCount: parseIntOrNull(row['Number of Pages']),
      status,
      dateStarted: '',
      dateFinished,
      notesList: wrapNote(noteText),
    });
  });

  return { bookFields, skippedRows };
}
