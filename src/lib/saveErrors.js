// Sorts a failed book save into one of a few kinds, so the UI can tell a
// dropped connection apart from a save the server refused.
export const SAVE_ERROR = {
  NETWORK: 'network',
  NO_LIBRARY: 'no_library',
  NOT_READY: 'not_ready',
  TRANSIENT: 'transient',
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

// The offline queue couldn't be opened, e.g. another tab still holds an
// older version of it open; trying again shortly usually works.
export class QueueUnavailableError extends Error {
  constructor() {
    super('The offline queue is not available right now.');
    this.name = 'QueueUnavailableError';
    this.code = 'queue_unavailable';
  }
}

export class LibrariesNotReadyError extends Error {
  constructor() {
    super('Libraries have not loaded yet.');
    this.name = 'LibrariesNotReadyError';
    this.code = SAVE_ERROR.NOT_READY;
  }
}

// Browsers word a failed fetch differently: Chrome "Failed to fetch",
// Safari "Load failed", Firefox "NetworkError when attempting to fetch".
const FETCH_FAILURE_MESSAGE = /failed to fetch|load failed|networkerror/i;

// A cancelled request is an AbortError; one cut off by AbortSignal.timeout()
// is a TimeoutError.
const ABORTED = /^(AbortError|TimeoutError)\b/;

// Matches both a raw fetch rejection and the plain error object supabase-js
// builds from one, whose message is prefixed with the original error name.
function isFetchFailure(err) {
  const message = err?.message ?? '';
  if (ABORTED.test(err?.name ?? '') || ABORTED.test(message)) return true;
  const isTypeError = err?.name === 'TypeError' || /^TypeError\b/.test(message);
  return isTypeError && FETCH_FAILURE_MESSAGE.test(message);
}

export function classifySaveError(err, isOnline = typeof navigator === 'undefined' ? true : navigator.onLine) {
  if (err instanceof NoLibraryError) return SAVE_ERROR.NO_LIBRARY;
  if (err instanceof LibrariesNotReadyError) return SAVE_ERROR.NOT_READY;
  // Checked before the offline test: queueing is exactly what offline saves do.
  if (err instanceof QueueUnavailableError) return SAVE_ERROR.TRANSIENT;
  if (!isOnline || isFetchFailure(err)) return SAVE_ERROR.NETWORK;
  if (TRANSIENT_CODES.has(err?.code)) return SAVE_ERROR.TRANSIENT;
  return SAVE_ERROR.REJECTED;
}
