// Sorts a failed book save into one of a few kinds, so the UI can tell a
// dropped connection apart from a save the server refused.
export const SAVE_ERROR = {
  NETWORK: 'network',
  NO_LIBRARY: 'no_library',
  NOT_READY: 'not_ready',
  REJECTED: 'rejected',
};

export class NoLibraryError extends Error {
  constructor() {
    super('A book must belong to at least one library.');
    this.name = 'NoLibraryError';
    this.code = SAVE_ERROR.NO_LIBRARY;
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
  if (!isOnline || isFetchFailure(err)) return SAVE_ERROR.NETWORK;
  return SAVE_ERROR.REJECTED;
}
