// Imported into the generated service worker (vite.config.js importScripts).
// Removes runtime caches that an earlier build created and nothing reads anymore.
const RETIRED_CACHES = ['openlibrary-cache'];

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all(RETIRED_CACHES.map((name) => caches.delete(name))));
});
