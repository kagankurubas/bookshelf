// Sorts a failed book save into one of a few kinds, so the UI can tell a
// dropped connection apart from a save the server refused.
export const SAVE_ERROR = {
  NETWORK: 'network',
  NO_LIBRARY: 'no_library',
  NOT_READY: 'not_ready',
  TRANSIENT: 'transient',
  STORAGE_FULL: 'storage_full',
  REJECTED: 'rejected',
};

// PostgREST's "JWT issued at future": a stale server clock rejecting a fresh
// token, which goes away on its own. Other auth errors (e.g. PGRST301) stay
// rejected.
const TRANSIENT_CODES = new Set(['PGRST303']);

export class NoLibraryError extends Error {
  constructor() {
    super('A book must belong to at least one library.');
    this.name = 'NoLibraryError';
    this.code = SAVE_ERROR.NO_LIBRARY;
  }
}

// The offline queue couldn't be used, e.g. another tab still holds an
// older version of it open or a transaction was aborted; trying again
// shortly usually works.
export class QueueUnavailableError extends Error {
  constructor(cause) {
    super('The offline queue is not available right now.', { cause });
    this.name = 'QueueUnavailableError';
    this.code = 'queue_unavailable';
  }
}

// The device has no room left to keep a book in the offline queue.
export class StorageFullError extends Error {
  constructor(cause) {
    super('The device storage is full.', { cause });
    this.name = 'StorageFullError';
    this.code = SAVE_ERROR.STORAGE_FULL;
  }
}

export class LibrariesNotReadyError extends Error {
  constructor() {
    super('Libraries have not loaded yet.');
    this.name = 'LibrariesNotReadyError';
    this.code = SAVE_ERROR.NOT_READY;
  }
}

// A failed fetch is recognised by its shape: the browser rejects with a
// TypeError (or AbortError/TimeoutError when cancelled or timed out), and
// supabase-js turns that into a plain error with an empty code and the
// original "Name: message" text.
const NETWORK_ERROR_NAMES = new Set(['TypeError', 'AbortError', 'TimeoutError']);
const WRAPPED_NETWORK_ERROR = /^(TypeError|AbortError|TimeoutError)\b/;

// Fallback for wrappers that drop the error name: the wording browsers use,
// e.g. Chrome "Failed to fetch", Firefox "NetworkError when attempting to
// fetch", Safari "Load failed", "The network connection was lost.", "The
// Internet connection appears to be offline.", "The request timed out.".
const FETCH_FAILURE_MESSAGE = /failed to fetch|networkerror|load failed|network connection was lost|appears to be offline|request timed out/i;

function isFetchFailure(err) {
  if (!err) return false;
  if (NETWORK_ERROR_NAMES.has(err.name)) return true;
  if (err.code) return false;
  const message = err.message ?? '';
  return WRAPPED_NETWORK_ERROR.test(message) || FETCH_FAILURE_MESSAGE.test(message);
}

export function classifySaveError(err, isOnline = typeof navigator === 'undefined' ? true : navigator.onLine) {
  if (err instanceof NoLibraryError) return SAVE_ERROR.NO_LIBRARY;
  if (err instanceof LibrariesNotReadyError) return SAVE_ERROR.NOT_READY;
  // Checked before the offline test: queueing is exactly what offline saves do.
  if (err instanceof QueueUnavailableError) return SAVE_ERROR.TRANSIENT;
  if (err instanceof StorageFullError) return SAVE_ERROR.STORAGE_FULL;
  if (!isOnline || isFetchFailure(err)) return SAVE_ERROR.NETWORK;
  if (TRANSIENT_CODES.has(err?.code)) return SAVE_ERROR.TRANSIENT;
  return SAVE_ERROR.REJECTED;
}
