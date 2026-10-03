import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useAddOrQueueBook } from './useAddOrQueueBook';
import { clearQueue, countUnsentBooks, enqueueBook, getQueuedBooks, removeQueuedBook } from '../lib/offlineBookQueue';

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
export function useOfflineBookQueue({ userId, addBook, addBookForSync, refreshStats, isReady }) {
  const [queuedCount, setQueuedCount] = useState(0);

  const refreshQueuedCount = () => {
    getQueuedBooks(userId)
      .then((queued) => setQueuedCount(queued.length))
      .catch((err) => console.error(err));
  };

  // Tries records sequentially (not in parallel); each one is deleted from
  // IndexedDB IMMEDIATELY on success (not in bulk) - so remaining records
  // stay safe if the sync is interrupted. If one item fails, the loop
  // stops, and the rest stay queued for retry on the next online transition.
  const flushQueuedBooks = async () => {
    if (!userId) return;
    const queued = await getQueuedBooks(userId);
    let addedAny = false;
    for (const queuedBook of queued) {
      // eslint-disable-next-line no-unused-vars
      const { id, ownerId, ...fields } = queuedBook;
      try {
        await addBookForSync(fields);
        await removeQueuedBook(id);
        addedAny = true;
      } catch (err) {
        console.error(err);
        break;
      }
    }
    if (addedAny) {
      refreshStats();
    }
    refreshQueuedCount();
  };

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
  // tab syncs that user's records again.
  const flushedForUserRef = useRef(null);
  useEffect(() => {
    if (!isReady || !userId) return;
    if (flushedForUserRef.current === userId) return;
    flushedForUserRef.current = userId;
    if (navigator.onLine) {
      flushQueuedBooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, userId]);

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
  };

  return { isOnline, queuedCount, addOrQueueBook, countUnsentForSignOut, discardQueue };
}
