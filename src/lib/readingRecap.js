// Okuma Özeti kartında gösterilecek kitapları belirleyen saf mantık. Diğer
// okuma istatistikleriyle aynı kural: bir kitap "okunmuş" sayılması için
// status'u Tamamlandı olmalı VE date_finished dolu olmalı (kayda ne zaman
// eklendiğine göre değil) - bkz. supabase/schema.sql'deki RPC'ler.
export const RECAP_COMPLETED_STATUS = 'Tamamlandı';

// Kart taşmasın diye gösterilecek en fazla sırt sayısı - kalanı "+N kitap
// daha" rozetiyle özetlenir.
export const MAX_VISIBLE_SPINES = 24;

// dateFinished bir Postgres "date" alanı (ör. "2026-09-14") - bunu
// new Date(...) ile parse etmek tarayıcı saat dilimine göre bir gün kayabilir
// (UTC gece yarısı yerel saate çevrilince önceki güne düşebilir). Yıl/ayı
// string'den doğrudan okumak bu kaymayı önler.
function parseFinishedDate(dateFinished) {
  if (!dateFinished) return null;
  const [year, month] = dateFinished.split('-').map(Number);
  if (!year || !month) return null;
  return { year, month };
}

// mode: 'month' | 'year'. 'month' modunda hem year hem month eşleşmeli,
// 'year' modunda sadece year.
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

// Yıl seçicisinin seçenekleri: kitaplıkta gerçekten bitirilmiş kitap olan
// yıllar (en yeniden en eskiye) - ama içinde bulunulan yıl hiç kitap yoksa
// bile listede olmalı, çünkü ekran her zaman o yılla/ayla açılıyor.
export function getRecapYearOptions(books, currentYear = new Date().getFullYear()) {
  const years = new Set([currentYear]);
  books.forEach((book) => {
    if (book.status !== RECAP_COMPLETED_STATUS) return;
    const parsed = parseFinishedDate(book.dateFinished);
    if (parsed) years.add(parsed.year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

// Kart üzerinde gösterilecek sırtları MAX_VISIBLE_SPINES ile sınırlar, kalanı
// bir taşma sayısı olarak döner.
export function splitForDisplay(books) {
  return {
    visible: books.slice(0, MAX_VISIBLE_SPINES),
    overflowCount: Math.max(0, books.length - MAX_VISIBLE_SPINES),
  };
}
