import { describe, it, expect } from 'vitest';
import { QUEUE_FAILURE, queueFailureCode, queueFailureOutcome } from './queueFailures';
import { LibrariesNotReadyError, NoLibraryError, QueueUnavailableError, classifySaveError, SAVE_ERROR } from './saveErrors';

describe('queueFailureOutcome', () => {
  it.each([
    ['RLS refusal', { code: '42501', message: 'new row violates row-level security policy' }],
    ['not-null constraint', { code: '23502', message: 'null value in column "title"' }],
    ['check constraint', { code: '23514', message: 'violates check constraint "books_rating_check"' }],
    ['foreign key', { code: '23503', message: 'violates foreign key constraint' }],
    ['invalid value', { code: '22P02', message: 'invalid input syntax for type uuid' }],
    ['another unique constraint', { code: '23505', message: 'duplicate key value violates unique constraint "book_libraries_pkey"' }],
  ])('counts a %s against the record', (_kind, err) => {
    expect(queueFailureOutcome(err, true)).toBe(QUEUE_FAILURE.COUNT);
  });

  it.each([
    ['network failure', { code: '', message: 'TypeError: Failed to fetch' }],
    ['raw fetch failure', new TypeError('Load failed')],
    ['timeout', { code: '', message: 'TimeoutError: The operation was aborted due to timeout' }],
    ['any error while offline', { code: '42501', message: 'whatever' }, false],
    ['stale-clock JWT (PGRST303)', { code: 'PGRST303', message: 'JWT issued at future' }],
    ['expired JWT (PGRST301)', { code: 'PGRST301', message: 'JWT expired' }],
    ['anonymous access (PGRST302)', { code: 'PGRST302', message: 'Anonymous access is disabled' }],
    ['HTTP 401', { status: 401, code: '', message: 'Unauthorized' }],
    ['unavailable queue', new QueueUnavailableError()],
    ['libraries not loaded', new LibrariesNotReadyError()],
    ['missing library', new NoLibraryError()],
  ])('leaves the record waiting after a %s', (_kind, err, isOnline = true) => {
    expect(queueFailureOutcome(err, isOnline)).toBe(QUEUE_FAILURE.WAIT);
  });

  it('skips a duplicate book id without counting it', () => {
    const duplicateId = { code: '23505', message: 'duplicate key value violates unique constraint "books_pkey"' };
    expect(queueFailureOutcome(duplicateId, true)).toBe(QUEUE_FAILURE.SKIP);
  });

  it('keeps the book dialog\'s own classification of an expired JWT unchanged', () => {
    expect(classifySaveError({ code: 'PGRST301', message: 'JWT expired' }, true)).toBe(SAVE_ERROR.REJECTED);
  });
});

describe('queueFailureCode', () => {
  it('records the database or PostgREST code, else the error name', () => {
    expect(queueFailureCode({ code: '42501' })).toBe('42501');
    expect(queueFailureCode(new QueueUnavailableError())).toBe('queue_unavailable');
    expect(queueFailureCode(new Error('x'))).toBe('Error');
    expect(queueFailureCode(undefined)).toBe('unknown');
  });
});
