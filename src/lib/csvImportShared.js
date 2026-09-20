import Papa from 'papaparse';

// Goodreads ve StoryGraph parserlarinin (goodreadsImport.js / storygraphImport.js)
// paylastigi ortak iskelet: Papa.parse ile ayristirma, bos-girdi/bos-alan/
// yanlis-format guard'lari, baslik-eksik-satir atlama, "sadece Tamamlandi
// ise dateFinished doldur" kurali ve not->notesList sarmalamasi. Platforme
// ozgu mantik (sutun adlari, ekstra durum degerleri, ISBN unwrap, rating
// yuvarlama) bilerek burada DEGIL, kendi dosyalarinda kaliyor.

// Her iki platformun da ayni sekilde eslendigi uc ortak durum. Platforme
// ozgu ek durumlar (ör. StoryGraph'in "did-not-finish" -> "Yarıda Bırakıldı")
// kendi dosyalarinda { ...BASE_STATUS_MAP, ... } ile genisletilir.
export const BASE_STATUS_MAP = {
  read: 'Tamamlandı',
  'currently-reading': 'Okunuyor',
  'to-read': 'Başlanmadı',
};
export const DEFAULT_STATUS = 'Başlanmadı';
export const COMPLETED_STATUS = 'Tamamlandı';

// Ham CSV metnini Papa.parse ile ayristirir ve ortak guard/format-tanima
// mantigini calistirir: bos girdi, bos parse sonucu, ve beklenmeyen sutunlar.
// hasExpectedColumns(fields): bu platformun formatini tanıyip tanımadığını
// (true/false) döner - StoryGraph gibi ek kontrol gerektiren platformlar
// bu callback icinde istedigi kontrolu yapabilir.
//
// Donus degeri iki sekilden biri:
//  - { error: 'malformed' | 'wrong-format' }
//  - { rows: [...], fields: [...] }
export function parseCsvRows(csvText, hasExpectedColumns) {
  if (!csvText || !csvText.trim()) {
    return { error: 'malformed' };
  }

  const parsed = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta?.fields || [];
  if (fields.length === 0) {
    return { error: 'malformed' };
  }

  if (!hasExpectedColumns(fields)) {
    return { error: 'wrong-format' };
  }

  return { rows: parsed.data, fields };
}

// Baslik bos olan bir satiri atlamak icin ortak kontrol - hem Goodreads hem
// StoryGraph icin ayni davranis: baslik yoksa skippedRows'a 'missing-title'
// nedeniyle eklenir ve null doner (caller bu satiri islemeyi durdurmali).
export function getTitleOrSkip(rawTitle, index, skippedRows) {
  const title = (rawTitle || '').trim();
  if (!title) {
    skippedRows.push({ index, reason: 'missing-title' });
    return null;
  }
  return title;
}

// Bitirme tarihi sadece durum "Tamamlandı" ise doldurulur - her iki platform
// da bu kurala uyuyor (ör. "Yarıda Bırakıldı" veya "Okunuyor" durumunda
// dateFinished hep bos kalir).
export function getDateFinishedIfCompleted(status, rawDate) {
  return status === COMPLETED_STATUS ? (rawDate || '').trim() : '';
}

// Ham not metnini bookFields'in notesList sekline sarar - bos/undefined ise
// bos array doner.
export function wrapNote(noteText) {
  const trimmed = (noteText || '').trim();
  return trimmed ? [{ text: trimmed }] : [];
}
