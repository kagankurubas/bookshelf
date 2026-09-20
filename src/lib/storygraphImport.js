import {
  parseCsvRows,
  getTitleOrSkip,
  getDateFinishedIfCompleted,
  wrapNote,
  BASE_STATUS_MAP,
  DEFAULT_STATUS,
} from './csvImportShared';

// StoryGraph'in gercek export basligindaki, formati taniyip tanimadigimizi
// anlamak icin kontrol ettigimiz sutunlar (Title, Authors her zaman gerekli).
// Okuma durumu sutunu ayri ele alinir - bkz. READ_STATUS_COLUMN_ALIASES.
const REQUIRED_COLUMNS = ['Title', 'Authors'];

// StoryGraph'in okuma-durumu sutununun tam adi kaynaklara gore farkli
// gosteriliyor: birincil kaynak (github.com/mateusz-bak/openreads issue #525,
// gercek bir export'tan alinmis) "Read Status" (iki kelime) diyor, bazi
// ikincil kaynaklar "ReadStatus" (tek kelime) gosteriyor. Bu belirsizligi
// kesin olarak cozemedigimiz icin, her iki yaziligi da taniyan toleransli bir
// sutun-bulucu yaziyoruz - varsayim yapip yanlis cikarsak import sessizce
// "wrong-format" hatasi verir, bu daha kotu bir kullanici deneyimi olurdu.
const READ_STATUS_COLUMN_ALIASES = ['Read Status', 'ReadStatus'];

// StoryGraph'in okuma durumu degerleri -> BookShelf'in Turkce durum adlarina
// eslemesi. StoryGraph'in "did-not-finish" (DNF) kavrami Goodreads'ten farkli
// olarak "Yarida Birakildi"ya tam karsilik buluyor. Ortak uc durum
// csvImportShared'dan geliyor, DNF burada platforme ozgu olarak eklenir.
const STATUS_TO_BOOKSHELF = {
  ...BASE_STATUS_MAP,
  'did-not-finish': 'Yarıda Bırakıldı',
};

function findReadStatusColumn(fields) {
  return READ_STATUS_COLUMN_ALIASES.find((col) => fields.includes(col)) || null;
}

// StoryGraph'in "Star Rating" sutunu 0.25 adimlarla kucuratli gelir (ör.
// 4.25, 3.5, 4.75). Spec karari: Math.round() ile en yakin tam sayiya
// yuvarla, 0-5 araligina clamp et. Ham deger zaten tam sayiysa "yuvarlandi"
// sayilmaz - sadece gercekten kucuratli bir deger tam sayiya donusturuldugunde
// wasRounded true doner, boylece cagiran kac kitabin puaninin yuvarlandigini
// sayabilir.
function roundAndClampRating(rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return { rating: 0, wasRounded: false };
  }
  const parsed = parseFloat(rawValue);
  if (Number.isNaN(parsed)) {
    return { rating: 0, wasRounded: false };
  }
  const rounded = Math.round(parsed);
  const clamped = Math.min(5, Math.max(0, rounded));
  return { rating: clamped, wasRounded: !Number.isInteger(parsed) };
}

// Ham StoryGraph CSV metnini alip BookShelf'in bookFields sekline (bkz.
// useBooks.js -> mapBookRow/addBook) esler. Supabase/DOM bagimliligi yok -
// saf fonksiyon, mocksuz test edilebilir. goodreadsImport.js ile ayni donus
// sozlesmesini paylasir, ek olarak roundedRatingsCount alani doner.
//
// Donus degeri iki sekilden biri:
//  - { error: 'malformed' | 'wrong-format' }  -> hicbir satir islenmedi
//  - { bookFields: [...], skippedRows: [...], roundedRatingsCount }
export function parseStoryGraphCsv(csvText) {
  const parseResult = parseCsvRows(
    csvText,
    (fields) => REQUIRED_COLUMNS.every((col) => fields.includes(col)) && Boolean(findReadStatusColumn(fields))
  );
  if (parseResult.error) {
    return parseResult;
  }

  const readStatusColumn = findReadStatusColumn(parseResult.fields);
  const bookFields = [];
  const skippedRows = [];
  let roundedRatingsCount = 0;

  parseResult.rows.forEach((row, index) => {
    const title = getTitleOrSkip(row['Title'], index, skippedRows);
    if (title === null) return;

    const author = (row['Authors'] || '').trim();
    const isbn = (row['ISBN/UID'] || '').trim();

    const statusRaw = (row[readStatusColumn] || '').trim();
    const status = STATUS_TO_BOOKSHELF[statusRaw] || DEFAULT_STATUS;

    const dateFinished = getDateFinishedIfCompleted(status, row['Last Date Read']);

    const { rating, wasRounded } = roundAndClampRating(row['Star Rating']);
    if (wasRounded) {
      roundedRatingsCount += 1;
    }

    const noteText = (row['Review'] || '').trim();

    bookFields.push({
      title,
      author,
      isbn,
      // StoryGraph export'unda Publisher ve sayfa sayisi sutunu yok - bu iki
      // alan hep bos/null kalir, bu bir hata degil beklenen davranistir.
      publisher: '',
      category: '',
      rating,
      pageCount: null,
      status,
      dateStarted: '',
      dateFinished,
      notesList: wrapNote(noteText),
    });
  });

  return { bookFields, skippedRows, roundedRatingsCount };
}
