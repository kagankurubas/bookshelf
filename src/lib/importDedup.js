// Ice aktarma onizlemesinde "muhtemel cift kayit" tespiti icin paylasilan
// yardimci - platformdan bagimsiz (Goodreads/StoryGraph farketmez), sadece
// title+author karsilastirir. bkz. spec: "case-insensitive ve bastaki/sondaki
// bosluklar temizlenerek (trim + lowercase normalizasyonu)".
export function normalizeTitleAuthor(title, author) {
  return `${(title || '').trim().toLowerCase()}::${(author || '').trim().toLowerCase()}`;
}

// existingBooks: useBooks().books (uygulama state'inde zaten yuklu) - ek bir
// DB sorgusu yapilmiyor. bookFields: parser'in urettigi satirlar.
// Donen liste, her satira `isPossibleDuplicate` alanini ekler; otomatik
// atlama YAPILMAZ, sadece isaretleme yapilir (secim UI'da yapilir).
export function markPossibleDuplicates(bookFields, existingBooks) {
  const existingKeys = new Set(
    (existingBooks || []).map((b) => normalizeTitleAuthor(b.title, b.author))
  );

  return bookFields.map((book) => ({
    ...book,
    isPossibleDuplicate: existingKeys.has(normalizeTitleAuthor(book.title, book.author)),
  }));
}
