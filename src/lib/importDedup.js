// Shared helper for "possible duplicate" detection in the import preview -
// platform-independent (Goodreads/StoryGraph don't matter), only compares
// title+author. See spec: "case-insensitive with leading/trailing
// whitespace trimmed (trim + lowercase normalization)".
export function normalizeTitleAuthor(title, author) {
  return `${(title || '').trim().toLowerCase()}::${(author || '').trim().toLowerCase()}`;
}

// existingBooks: useBooks().books (already loaded in app state) - no extra
// DB query is made. bookFields: rows produced by the parser. The returned
// list adds an `isPossibleDuplicate` field to each row; nothing is
// auto-skipped, it's only flagged (selection happens in the UI).
export function markPossibleDuplicates(bookFields, existingBooks) {
  const existingKeys = new Set(
    (existingBooks || []).map((b) => normalizeTitleAuthor(b.title, b.author))
  );

  return bookFields.map((book) => ({
    ...book,
    isPossibleDuplicate: existingKeys.has(normalizeTitleAuthor(book.title, book.author)),
  }));
}
