// The library a book goes into by default: the one marked default, or the
// first (oldest) library for accounts that have none marked.
export function findDefaultLibrary(libraries) {
  const list = libraries || [];
  return list.find((lib) => lib.isDefault) || list[0] || null;
}
