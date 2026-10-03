import { classifySaveError, SAVE_ERROR } from './saveErrors';

// What a failed send means for a queued record. This is stricter than the
// book dialog's classification on purpose: only a refusal of this record
// itself counts against it. Anything about the connection, the session or
// the queue leaves it waiting, because the same record will go through once
// that is sorted out (an expired JWT is refreshed, for example), and counting
// those would mark perfectly good books as failed.
export const QUEUE_FAILURE = {
  WAIT: 'wait',
  COUNT: 'count',
  SKIP: 'skip',
};

// PostgREST's JWT and session errors (PGRST300-399).
const AUTH_ERROR_CODE = /^PGRST3\d\d$/;

export function queueFailureOutcome(err, isOnline) {
  // A duplicate book id is left alone until retries become idempotent.
  if (err?.code === '23505' && (err.message || '').includes('books_pkey')) return QUEUE_FAILURE.SKIP;
  if (AUTH_ERROR_CODE.test(err?.code ?? '') || err?.status === 401) return QUEUE_FAILURE.WAIT;
  return classifySaveError(err, isOnline) === SAVE_ERROR.REJECTED ? QUEUE_FAILURE.COUNT : QUEUE_FAILURE.WAIT;
}

export function queueFailureCode(err) {
  return err?.code || err?.name || 'unknown';
}
