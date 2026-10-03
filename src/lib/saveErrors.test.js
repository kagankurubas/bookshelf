import { describe, it, expect } from 'vitest';
import { classifySaveError, LibrariesNotReadyError, NoLibraryError, SAVE_ERROR } from './saveErrors';

// The shape supabase-js returns when the underlying fetch itself fails.
function supabaseFetchFailure(message) {
  return { message: `TypeError: ${message}`, details: '', hint: '', code: '' };
}

describe('classifySaveError', () => {
  it.each([
    ['Chrome', 'Failed to fetch'],
    ['Safari', 'Load failed'],
    ['Firefox', 'NetworkError when attempting to fetch resource.'],
  ])('treats a supabase-js fetch failure from %s as a network error', (_browser, message) => {
    expect(classifySaveError(supabaseFetchFailure(message), true)).toBe(SAVE_ERROR.NETWORK);
  });

  it('treats a raw fetch TypeError and an aborted request as network errors', () => {
    expect(classifySaveError(new TypeError('Failed to fetch'), true)).toBe(SAVE_ERROR.NETWORK);
    expect(classifySaveError({ message: 'AbortError: signal is aborted', code: '' }, true)).toBe(SAVE_ERROR.NETWORK);
  });

  it('treats a cancelled or timed-out request as a network error, raw or wrapped by supabase-js', () => {
    const controller = new AbortController();
    controller.abort();
    expect(classifySaveError(controller.signal.reason, true)).toBe(SAVE_ERROR.NETWORK);
    expect(classifySaveError(new DOMException('The operation was aborted due to timeout', 'TimeoutError'), true))
      .toBe(SAVE_ERROR.NETWORK);
    expect(classifySaveError(
      { message: 'TimeoutError: The operation was aborted due to timeout', code: '', hint: 'Request was aborted (timeout or manual cancellation)' },
      true,
    )).toBe(SAVE_ERROR.NETWORK);
  });

  it('does not mistake an unrelated TypeError (a bug) for a dropped connection', () => {
    expect(classifySaveError(new TypeError("Cannot read properties of undefined (reading 'id')"), true))
      .toBe(SAVE_ERROR.REJECTED);
  });

  it('treats any failure while the browser reports offline as a network error', () => {
    expect(classifySaveError({ message: 'whatever', code: '42501' }, false)).toBe(SAVE_ERROR.NETWORK);
  });

  it.each([
    ['RLS', { code: '42501', message: 'new row violates row-level security policy' }],
    ['not-null', { code: '23502', message: 'null value in column "library_id"' }],
    ['PostgREST', { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }],
    ['unknown', new Error('something else')],
  ])('treats a %s error from the server as rejected', (_kind, err) => {
    expect(classifySaveError(err, true)).toBe(SAVE_ERROR.REJECTED);
  });

  it('treats only PostgREST\'s "JWT issued at future" as transient', () => {
    expect(classifySaveError({ code: 'PGRST303', message: 'JWT issued at future', details: null, hint: null }, true))
      .toBe(SAVE_ERROR.TRANSIENT);
    expect(classifySaveError({ code: 'PGRST301', message: 'JWT expired' }, true)).toBe(SAVE_ERROR.REJECTED);
    expect(classifySaveError({ code: 'PGRST302', message: 'Anonymous access is disabled' }, true)).toBe(SAVE_ERROR.REJECTED);
    expect(classifySaveError({ code: 'PGRST116', message: 'no rows' }, true)).toBe(SAVE_ERROR.REJECTED);
  });

  it('keeps a missing library and not-yet-loaded libraries distinct, even offline', () => {
    expect(classifySaveError(new NoLibraryError(), true)).toBe(SAVE_ERROR.NO_LIBRARY);
    expect(classifySaveError(new NoLibraryError(), false)).toBe(SAVE_ERROR.NO_LIBRARY);
    expect(classifySaveError(new LibrariesNotReadyError(), true)).toBe(SAVE_ERROR.NOT_READY);
    expect(classifySaveError(new LibrariesNotReadyError(), false)).toBe(SAVE_ERROR.NOT_READY);
  });
});
