// What a failed send means for a queued record. Only a known refusal of this
// record itself counts against it. Everything else - the connection, the
// session, the queue, the device, and any error not on the list below,
// server errors included - leaves it waiting, because the same record may
// well go through later, and counting those would mark good books failed.
export const QUEUE_FAILURE = {
  WAIT: 'wait',
  COUNT: 'count',
  SKIP: 'skip',
};

// Postgres refusals that are about the record's own data: RLS, not-null,
// foreign key, check, unique (other than the book id) and invalid values.
const RECORD_REFUSAL_CODES = new Set(['42501', '23502', '23503', '23514', '23505', '22P02']);

function isDuplicateBookId(err) {
  return err?.code === '23505' && (err.message || '').includes('books_pkey');
}

export function queueFailureOutcome(err, isOnline) {
  if (!isOnline) return QUEUE_FAILURE.WAIT;
  // A duplicate book id is left alone until retries become idempotent.
  if (isDuplicateBookId(err)) return QUEUE_FAILURE.SKIP;
  return RECORD_REFUSAL_CODES.has(err?.code) ? QUEUE_FAILURE.COUNT : QUEUE_FAILURE.WAIT;
}

export function queueFailureCode(err) {
  return err?.code || err?.name || 'unknown';
}
