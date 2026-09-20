import Papa from 'papaparse';

// Kitaplık adları (CSV'de) ve not metinleri (CSV'de) birden fazla değeri tek
// bir sütunda taşımak için kullanılan ayırıcılar. Papa.unparse gömülü
// newline'ları doğru şekilde tırnaklayıp kaçışladığı için "\n---\n" bile
// güvenle tek bir hücrede saklanabilir.
const LIBRARY_NAME_SEPARATOR = '; ';
const NOTE_TEXT_SEPARATOR = '\n---\n';

// UI-only alanlar (coverImage, coverPosition, shelfId, shelfRow, slotIndex)
// bilinçli olarak burada listelenmiyor - uygulama dışında (veya geri içe
// aktarıldığında) anlamsızlar, bkz. spec "Dışa aktarımda hariç tutulanlar".
function resolveLibraryNames(book, libraryNameById) {
  return (book.libraryIds || [])
    .map((id) => libraryNameById[id])
    .filter(Boolean);
}

function toCommonFields(book, libraryNameById) {
  return {
    title: book.title || '',
    author: book.author || '',
    publisher: book.publisher || '',
    category: book.category || '',
    status: book.status || '',
    rating: book.rating ?? 0,
    isbn: book.isbn || '',
    pageCount: book.pageCount ?? null,
    isFavorite: !!book.isFavorite,
    dateStarted: book.dateStarted || '',
    dateFinished: book.dateFinished || '',
    createdAt: book.createdAt || '',
    libraryNames: resolveLibraryNames(book, libraryNameById),
  };
}

// CSV: kitaplık adları "; " ile, not metinleri "\n---\n" ile tek bir sütunda
// birleştirilir - notların { text, date } yapısı JSON'a özgü, CSV'de sadece
// metinler saklanır (spec: "Export edilen alanlar").
export function buildBooksCsv(books, libraryNameById = {}) {
  const rows = books.map((book) => {
    const fields = toCommonFields(book, libraryNameById);
    const notesList = book.notesList || [];
    return {
      title: fields.title,
      author: fields.author,
      publisher: fields.publisher,
      category: fields.category,
      status: fields.status,
      rating: fields.rating,
      isbn: fields.isbn,
      pageCount: fields.pageCount,
      isFavorite: fields.isFavorite,
      dateStarted: fields.dateStarted,
      dateFinished: fields.dateFinished,
      createdAt: fields.createdAt,
      libraries: fields.libraryNames.join(LIBRARY_NAME_SEPARATOR),
      notes: notesList.map((n) => n.text).join(NOTE_TEXT_SEPARATOR),
    };
  });
  return Papa.unparse(rows);
}

// JSON: tam yedek formatı - kitaplık adları bir dizi olarak, notlar
// { text, date } yapısıyla tam olarak korunur.
export function buildBooksJson(books, libraryNameById = {}) {
  const rows = books.map((book) => {
    const fields = toCommonFields(book, libraryNameById);
    const notesList = book.notesList || [];
    return {
      title: fields.title,
      author: fields.author,
      publisher: fields.publisher,
      category: fields.category,
      status: fields.status,
      rating: fields.rating,
      isbn: fields.isbn,
      pageCount: fields.pageCount,
      isFavorite: fields.isFavorite,
      dateStarted: fields.dateStarted,
      dateFinished: fields.dateFinished,
      createdAt: fields.createdAt,
      libraries: fields.libraryNames,
      notes: notesList.map((n) => ({ text: n.text, date: n.date })),
    };
  });
  return JSON.stringify(rows, null, 2);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

// bookshelf-export-YYYY-MM-DD.<extension> - indirme anındaki yerel tarih
// (spec: "Dosya adı konvansiyonu").
export function getExportFilename(extension, date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `bookshelf-export-${year}-${month}-${day}.${extension}`;
}
