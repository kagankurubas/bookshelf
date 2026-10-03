// Points a queued book at the signed-in user's own libraries before it is
// sent: drops null ids and ids of libraries the user no longer has, and adds
// their default library, so a record queued without a library (or into a
// since-deleted one) still lands somewhere. Callers make sure `libraries` is
// the record owner's own, non-empty list.
export function repairLibraryIds(libraryIds, libraries) {
  const ownIds = new Set(libraries.map((lib) => lib.id));
  const defaultLibrary = libraries.find((lib) => lib.isDefault) || libraries[0];
  const kept = (Array.isArray(libraryIds) ? libraryIds : []).filter((id) => ownIds.has(id));
  return Array.from(new Set([...kept, defaultLibrary.id]));
}
