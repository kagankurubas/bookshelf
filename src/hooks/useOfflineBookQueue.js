import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useAddOrQueueBook } from './useAddOrQueueBook';
import {
  clearQueue,
  countUnownedBooks,
  countUnsentBooks,
  enqueueBook,
  getQueuedBooks,
  recordRejectedAttempt,
  removeQueuedBook,
} from '../lib/offlineBookQueue';
import { QueueUnavailableError } from '../lib/saveErrors';
import { repairLibraryIds } from '../lib/queuedBookRepair';
import { QUEUE_FAILURE, queueFailureCode, queueFailureOutcome } from '../lib/queueFailures';

// How long to wait before retrying a sync the queue itself refused.
export const QUEUE_RETRY_DELAY_MS = 5000;

// Centralizes the whole offline book-add queue orchestration (staying
// embedded in App.jsx would both be a second, unrelated reason for it to
// change and make it untestable): the pending-record count, a flush that
// syncs records sequentially (not in parallel), and the "add directly vs
// queue" decision based on online/offline status.
//
// `addBook`: adds a single book immediately while online (refreshes stats
// itself). `addBookForSync`: a stats-free variant for flushing N books, so
// stats aren't refreshed N times - `refreshStats` is called once after the
// loop finishes. `isReady` is controlled from outside so a flush isn't
// attempted before library data (activeLibraryId) has loaded.
//
// Records belong to the user who queued them (`userId`): only that user's
// records are counted and synced, and nothing syncs while signed out.
export function useOfflineBookQueue({ userId, libraries = [], addBook, addBookForSync, refreshStats, isReady, retryDelayMs = QUEUE_RETRY_DELAY_MS }) {
  const [queuedCount, setQueuedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const flushRef = useRef(null);
  const retryTimerRef = useRef(null);

  // One delayed retry when the queue itself couldn't be opened (another tab
  // still holding an older version), so the sync isn't lost until the next
  // online transition.
  const scheduleRetry = () => {
    if (retryTimerRef.current) return;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      flushRef.current?.();
    }, retryDelayMs);
  };

  useEffect(() => () => clearTimeout(retryTimerRef.current), []);

  // queuedCount: the user's records still waiting to be sent. failedCount:
  // the ones marked failed, plus unowned records nobody can send.
  const refreshQueuedCount = () => {
    Promise.all([getQueuedBooks(userId), userId ? countUnownedBooks() : 0])
      .then(([queued, unowned]) => {
        setQueuedCount(queued.filter((record) => !record.failed).length);
        setFailedCount(queued.filter((record) => record.failed).length + unowned);
      })
      .catch((err) => console.error(err));
  };

  // Tries records sequentially (not in parallel); each one is deleted from
  // IndexedDB IMMEDIATELY on success (not in bulk) - so remaining records
  // stay safe if the sync is interrupted. A failure that isn't about the
  // record itself (connection, session, queue) stops the loop with every
  // record left waiting; a refusal of the record itself counts against it
  // and the loop moves on (see lib/queueFailures.js).
  const syncQueuedBooks = async () => {
    if (!userId) return;
    // Without a library there is nothing to file the books into: every
    // record stays queued, untouched and uncounted, until one exists.
    if (libraries.length === 0) return;
    let queued;
    try {
      queued = await getQueuedBooks(userId);
    } catch (err) {
      console.error(err);
      if (err instanceof QueueUnavailableError) scheduleRetry();
      return;
    }
    let addedAny = false;
    for (const queuedBook of queued) {
      if (queuedBook.failed) continue;
      // eslint-disable-next-line no-unused-vars
      const { id, ownerId, attempts, lastErrorCode, lastAttemptAt, failed, ...fields } = queuedBook;
      try {
        await addBookForSync({ ...fields, libraryIds: repairLibraryIds(fields.libraryIds, libraries) });
        await removeQueuedBook(id);
        addedAny = true;
      } catch (err) {
        console.error(err);
        const outcome = queueFailureOutcome(err, navigator.onLine);
        if (outcome === QUEUE_FAILURE.WAIT) break;
        if (outcome === QUEUE_FAILURE.COUNT) {
          try {
            await recordRejectedAttempt(id, queueFailureCode(err));
          } catch (recordError) {
            console.error(recordError);
            break;
          }
        }
      }
    }
    if (addedAny) {
      refreshStats();
    }
    refreshQueuedCount();
  };

  // One sync at a time in this tab: a trigger that arrives while one is
  // running (load, coming back online, the retry timer) doesn't start a
  // second pass over the same records; it asks for one more pass afterwards.
  const flushingRef = useRef(false);
  const flushAgainRef = useRef(false);
  const flushQueuedBooks = async () => {
    if (flushingRef.current) {
      flushAgainRef.current = true;
      return;
    }
    flushingRef.current = true;
    try {
      await syncQueuedBooks();
    } finally {
      flushingRef.current = false;
    }
    if (flushAgainRef.current) {
      flushAgainRef.current = false;
      flushRef.current?.();
    }
  };
  useEffect(() => {
    flushRef.current = flushQueuedBooks;
  });

  // Even though a new onOnline closure (wrapping this render's current
  // addBookForSync/refreshStats via flushQueuedBooks) is passed to
  // useOnlineStatus on every render, it always calls the LATEST closure on
  // an actual 'offline'->'online' transition (see useOnlineStatus.js - via
  // a ref). This keeps the sync from running against stale/unloaded
  // library data.
  const isOnline = useOnlineStatus(() => {
    flushQueuedBooks();
  });

  // The queue-or-add decision (based on the isOnline flag, not on
  // attempting a write and inspecting the error type) is delegated to an
  // isolated/testable helper (useAddOrQueueBook); here we only refresh the
  // counter after an add that ends up queued.
  const addOrQueueBookRaw = useAddOrQueueBook({
    isOnline,
    addBook,
    enqueueBook: (fields) => enqueueBook(userId, fields),
  });
  const addOrQueueBook = async (fields) => {
    const outcome = await addOrQueueBookRaw(fields);
    if (outcome?.queued) {
      refreshQueuedCount();
    }
    return outcome;
  };

  // If the app is closed while offline and reopened while already ONLINE,
  // the 'online' event never fires (the browser is already online) - so we
  // also check once as soon as `isReady` becomes true (once library data is
  // ready). flushQueuedBooks is deliberately left out of the deps - it's a
  // closure that's recreated every render, but we only want the ONE call
  // guarded by flushedForUserRef (the latest closure at the moment the
  // data first becomes ready). Keyed by user, so signing back in on the same
  // tab syncs that user's records again; it waits for a first library, so
  // books queued without one go out as soon as the user creates it.
  const flushedForUserRef = useRef(null);
  const hasLibraries = libraries.length > 0;
  useEffect(() => {
    if (!isReady || !userId || !hasLibraries) return;
    if (flushedForUserRef.current === userId) return;
    flushedForUserRef.current = userId;
    if (navigator.onLine) {
      flushQueuedBooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, userId, hasLibraries]);

  // Read on startup and whenever the signed-in user changes, so the banner
  // shows that user's count from the first render.
  useEffect(() => {
    refreshQueuedCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // For the sign-out button only: how many records signing out would
  // discard, and discarding them. A forced sign-out (expired session) keeps
  // the queue for the same user's next sign-in.
  const countUnsentForSignOut = () => (userId ? countUnsentBooks(userId) : Promise.resolve(0));
  const discardQueue = async () => {
    await clearQueue();
    setQueuedCount(0);
    setFailedCount(0);
  };

  return { isOnline, queuedCount, failedCount, addOrQueueBook, countUnsentForSignOut, discardQueue };
}
