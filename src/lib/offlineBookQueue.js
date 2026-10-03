// A simple FIFO queue holding books the user tried to add while offline,
// in the browser (surviving tab close/refresh), until connectivity returns.
// This is a minimal single-object-store use case, so a wrapper like `idb`
// is unnecessary - the raw `indexedDB` API is wrapped directly in a
// Promise. Follows the same "pure function, independent of
// Supabase/React" pattern as src/lib/openLibrary.js.
const DB_NAME = 'bookshelf-offline-queue';
// Version 2 adds the owner index; records written by version 1 carry no owner.
const DB_VERSION = 2;
const STORE_NAME = 'pendingBooks';
const OWNER_INDEX = 'ownerId';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      // autoIncrement guarantees both a unique id and insertion order
      // (FIFO) - getAll() results are returned in key order by default.
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      if (!store.indexNames.contains(OWNER_INDEX)) {
        store.createIndex(OWNER_INDEX, 'ownerId');
      }
      // Records queued before owners were stored can't be attributed to
      // anyone, so they are marked unowned and never sent on anyone's behalf.
      if (event.oldVersion >= 1) {
        store.openCursor().onsuccess = (cursorEvent) => {
          const cursor = cursorEvent.target.result;
          if (!cursor) return;
          if (cursor.value.ownerId === undefined) cursor.update({ ...cursor.value, ownerId: null });
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// `run(store)` returns an IDBRequest; its `.result` resolves when the
// wrapping transaction's `oncomplete` fires (i.e. once data is actually
// written to disk/browser storage).
async function withStore(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = run(store);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Adds book fields to the queue under the signed-in user who queued them,
// returns the record's auto-generated id.
//
// The caller (App.jsx) spreads bookData from BookModal's state as-is - for
// a new book this includes a field explicitly holding `id: undefined` (not
// saved yet). Since `id` is the object store's keyPath and the store uses
// autoIncrement, IndexedDB throws "not a valid key" for a field explicitly
// set to `id: undefined`, even though auto key generation works fine for a
// field that's genuinely missing (Chromium distinguishes the two). So `id`
// is deliberately stripped here - the caller isn't trusted to do it.
export function enqueueBook(ownerId, bookFields) {
  if (!ownerId) return Promise.reject(new Error('Only a signed-in user can queue a book.'));
  const fieldsWithoutId = { ...bookFields, ownerId };
  delete fieldsWithoutId.id;
  return withStore('readwrite', (store) => store.add(fieldsWithoutId));
}

// Returns one user's queued records in insertion order (FIFO). Each record
// also carries its auto-generated `id` and its `ownerId`.
export function getQueuedBooks(ownerId) {
  if (!ownerId) return Promise.resolve([]);
  return withStore('readonly', (store) => store.index(OWNER_INDEX).getAll(ownerId));
}

// Records that signing out with the button would discard: the user's own
// plus the unowned ones left over from before records had owners.
export async function countUnsentBooks(ownerId) {
  const records = await withStore('readonly', (store) => store.getAll());
  return records.filter((record) => record.ownerId === ownerId || record.ownerId == null).length;
}

// Removes a record from the queue that was successfully synced (or is no
// longer needed).
export function removeQueuedBook(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

export function clearQueue() {
  return withStore('readwrite', (store) => store.clear());
}

// Drops another user's records when someone else signs in on this device;
// unowned records are left alone.
export function removeBooksOwnedByOthers(ownerId) {
  return withStore('readwrite', (store) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (cursor.value.ownerId != null && cursor.value.ownerId !== ownerId) cursor.delete();
      cursor.continue();
    };
    return request;
  });
}
