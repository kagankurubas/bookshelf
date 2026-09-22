// Extracted into an isolated helper so the "add directly if online,
// otherwise queue" decision isn't left as an untestable closure buried in
// App.jsx. The decision is based on the `isOnline` flag AT CLICK TIME,
// not on attempting a write and inspecting the error type (same principle
// as the error-handling ticket: base the network-error distinction on
// isOnline, not on throw).
//
// `addBook` and `enqueueBook` are injected from outside (same pattern as
// useLibrary taking its own mutators from outside) so a pure unit test can
// be written without touching real IndexedDB or Supabase.
export function useAddOrQueueBook({ isOnline, addBook, enqueueBook }) {
  return async (fields) => {
    if (isOnline) {
      return addBook(fields);
    }
    await enqueueBook(fields);
    return { queued: true };
  };
}
