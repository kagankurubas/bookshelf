// A simple FIFO queue holding books the user tried to add while offline,
// in the browser (surviving tab close/refresh), until connectivity returns.
// This is a minimal single-object-store use case, so a wrapper like `idb`
// is unnecessary - the raw `indexedDB` API is wrapped directly in a
// Promise. Follows the same "pure function, independent of
// Supabase/React" pattern as src/lib/openLibrary.js.
const DB_NAME = 'bookshelf-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pendingBooks';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // autoIncrement guarantees both a unique id and insertion order
        // (FIFO) - getAll() results are returned in key order by default.
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
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

// Adds book fields to the queue, returns the record's auto-generated id.
//
// The caller (App.jsx) spreads bookData from BookModal's state as-is - for
// a new book this includes a field explicitly holding `id: undefined` (not
// saved yet). Since `id` is the object store's keyPath and the store uses
// autoIncrement, IndexedDB throws "not a valid key" for a field explicitly
// set to `id: undefined`, even though auto key generation works fine for a
// field that's genuinely missing (Chromium distinguishes the two). So `id`
// is deliberately stripped here - the caller isn't trusted to do it.
export function enqueueBook(bookFields) {
  const fieldsWithoutId = { ...bookFields };
  delete fieldsWithoutId.id;
  return withStore('readwrite', (store) => store.add(fieldsWithoutId));
}

// Returns all queued records in insertion order (FIFO). Each record also
// carries an auto-generated `id` field alongside its original fields.
export function getQueuedBooks() {
  return withStore('readonly', (store) => store.getAll());
}

// Removes a record from the queue that was successfully synced (or is no
// longer needed).
export function removeQueuedBook(id) {
  return withStore('readwrite', (store) => store.delete(id));
}
