Status: ready-for-agent

# Cover image optimization (lazy loading, size-appropriate variants, load-error fallback)

## Problem Statement

On mobile, opening a library eagerly downloads every book's cover, even the ones far below the fold. A 100-book library in Cards view pulls roughly 100 × 50–70 KB of Open Library `-L` covers on first paint. Separately, two tiny thumbnail lists (book search results and the batch scanner) download covers far larger than the ~40 px slot they are shown in, and the batch scanner shows the full `-L` variant in a 36 × 52 px box.

The original task assumed covers are fetched at "original size". Research shows that's not quite right: Open Library's largest variant, `-L`, is capped at 500 px tall (~330 px wide, ~50–70 KB). It is not the original upload. So the savings come from not downloading off-screen covers and from using smaller variants in thumbnail slots, not from shrinking the Cards view banner.

## Research findings

- **Open Library cover API** (`covers.openlibrary.org/b/{id|isbn|olid}/{key}-{S|M|L}.jpg`). Measured on two real covers:
  - `S`: 38 × 58 px, ~2 KB
  - `M`: 180 × ~270 px, ~18–24 KB
  - `L`: ~330 × 500 px, ~47–71 KB
  - When a cover is missing, the API returns HTTP 200 with a 43-byte 1 × 1 placeholder. `?default=false` makes it return 404 instead.
- **URLs the app currently stores** (the `cover_image` column, as a full URL string):
  - ISBN lookup (barcode, batch scan, ISBN add) stores `cover.large`, which is an `-L` URL. It only falls back to medium/small when large is missing.
  - Text search stores `-M` URLs built from `cover_i`.
  - Users can also paste any URL in the book modal, so arbitrary hosts are possible.
- **Where covers render.** Table and Shelf views render no cover images at all.
  - **Cards view** banner: full card width (grid `minmax(260px, 1fr)`, a single column ~340–450 px wide on mobile) × 168 px, `object-fit: cover`. Because the banner is wide and short, the image is scaled to card width. `-L` (~330 px wide) is already at or below the needed resolution, even at DPR 1. `-M` would look visibly blurry.
  - **Book modal preview**: full modal width × 240 px, `object-fit: cover`. It needs `-L` for the same reason.
  - **Book search results**: 40 × 58 px thumbnail, currently `-M`.
  - **Batch scanner rows**: 36 × 52 px thumbnail, currently `-L` from the ISBN lookup. This is the worst mismatch.
- **Lazy loading**: the project has no IntersectionObserver-based image loading and no existing `loading` attribute anywhere. Native `loading="lazy"` is enough.
- **Fallback behavior**: the only fallback is "empty `coverImage` → placeholder branch". There is no `onError` handling today. A broken URL shows the browser's broken-image icon, and an Open Library "no cover" shows as a blank 1 × 1 image stretched to fill the slot.
- **Service worker**: covers are already runtime-cached `CacheFirst` in `openlibrary-cache` (200 entries, 30 days). Requesting a different variant creates a separate cache entry.

## Solution

1. Add native lazy loading (`loading="lazy"` + `decoding="async"`) to Cards view covers. This is where the real mobile data savings are, since off-screen cards no longer fetch their covers.
2. Add a small pure helper to the Open Library module that, given a stored cover URL and a target size (`S`/`M`/`L`), returns the equivalent Open Library variant URL. For any non-Open Library URL it returns the input unchanged.
3. In the two thumbnail lists (book search, batch scanner), render a size-appropriate variant with an `x`-descriptor `srcset`: `S` for 1x and `M` for 2x/3x. Lazy loading goes there too, since search results can scroll.
4. Leave Cards view and the book modal on the stored (`-L`) URL. Width-based `srcset` there would always resolve to `-L`, so it adds complexity with no savings.
5. Keep storing `-L` in the database. Variant selection happens at render time, so no migration is needed and the stored URL remains the high-quality source of truth.
6. At render time, every Open Library cover URL gets `?default=false`, so a book with no cover on Open Library returns a real 404 instead of a silent 1 × 1 blank image.
7. Every cover `<img>` (Cards view, book modal preview, book search, batch scanner) gets an `onError` handler that falls back to that component's existing placeholder. The placeholder markup itself is unchanged. It is simply also shown when a URL exists but fails to load (404, dead host, bad URL).

## User Stories

1. As a mobile user with a large library, I want covers below the fold not to download until I scroll near them, so that opening the app uses less data.
2. As a mobile user, I want the Cards view to load its first screen of covers as fast as it does today, so that lazy loading never makes the visible content feel slower.
3. As a user on a high-DPI phone, I want Cards view covers to stay as sharp as they are now, so that the optimization doesn't make my library look worse.
4. As a user scanning many barcodes in a row, I want the batch scanner's small thumbnails to download a small image, so that a long scanning session doesn't waste data on 70 KB covers shown at 36 px.
5. As a user searching for a book by title, I want result thumbnails to load a small variant on low-DPI screens and a sharp one on high-DPI screens, so that results appear quickly and still look crisp.
6. As a user who pasted a custom cover URL from another site, I want that cover to keep displaying exactly as before, so that the optimization never breaks non-Open Library images.
7. As a user whose book has no cover, I want to keep seeing the existing "+" placeholder, so that nothing changes for coverless books.
8. As a user who adds a book from a search result, I want the saved cover to keep the same URL as today, so that nothing about my stored data changes.
9. As a user who adds a book via ISBN/barcode, I want the saved cover to stay the high-quality `-L` URL, so that the Cards view and the book modal still show a sharp image.
10. As a user editing a book, I want the modal cover preview and drag-to-reposition to behave exactly as today, so that the optimization doesn't touch the cover editing UI.
11. As an offline user, I want previously viewed covers to keep loading from the service-worker cache, so that offline browsing still shows covers I have already seen.
12. As a user whose saved cover URL no longer resolves (Open Library has no cover, or a pasted URL's host is gone), I want to see the normal placeholder instead of a blank box or a broken-image icon, so that my library looks intentional.
13. As a user opening a book whose cover fails to load, I want the modal to show the usual "Add Cover" state, so that I can replace the broken URL right away.
14. As a user who pastes a URL that turns out not to be an image, I want the modal to fall back to the cover URL input, so that I can try another URL.
15. As a user on desktop, I want lazy loading to be invisible, meaning no layout jumps, so that the banner height stays fixed whether or not the image has loaded.

## Implementation Decisions

- **New pure helper in the Open Library module**: given a cover URL and a size letter, it returns the rewritten URL. It recognizes the `covers.openlibrary.org/b/<type>/<key>-<S|M|L>.jpg` shape (id/isbn/olid, with or without a query string). Any other URL, including empty or null, is returned unchanged. This is the single place that knows Open Library's URL scheme for variants.
- **Thumbnail rendering (book search, batch scanner)**: `src` = the `S` variant, `srcset` = `S 1x, M 2x`, plus `loading="lazy"` and `decoding="async"`. For non-Open Library URLs, the helper returns the same URL for both, so the `srcset` is harmless. Omitting it in that case is optional, but it is not required for correctness.
- **Cards view**: add `loading="lazy"` and `decoding="async"`, with no `srcset`. The banner already has a fixed 168 px height, so lazy loading introduces no layout shift.
- **Book modal**: unchanged. It shows one image at a time, above the fold.
- **Stored data**: no schema change and no change to what `getBookByIsbn`/`searchBooks` return. The ISBN path keeps storing `-L`, and search keeps returning `-M`, which is also what gets saved when a search result is added.
- **`?default=false`**: the same render-time helper appends `default=false` to every Open Library cover URL it rewrites. Stored URLs are not modified. Existing rows benefit automatically, and nothing new is written to the database.
- **Fallback on load error**: a small hook tracks which cover URLs failed to load during the component's lifetime (a set keyed by the stored URL). Each cover `<img>` calls it from `onError`. Each component's existing condition changes from "has a URL" to "has a URL and that URL hasn't failed", and the existing placeholder branch renders unchanged. Keying by URL means that if the URL changes (for example, a new one is typed in the modal), it is tried again.
- **Book modal specifics**: the frame's height, background, and grab cursor currently key off "has a URL". They switch to the same "has a URL that hasn't failed" condition, so a failed cover looks exactly like no cover. That means the "Add Cover" button, or the URL input if the user was in the middle of adding one. The stored URL stays in form state until the user replaces it, so opening and saving a book never silently deletes its cover URL.
- **Service worker**: no config change. The existing `openlibrary-cache` pattern already matches every variant.

## Testing Decisions

- A good test here asserts observable output: the URL a helper returns, or the attributes a rendered `<img>` ends up with. It does not assert how the rewrite is implemented.
- **Helper unit tests**, alongside the existing Open Library module tests (prior art: the current `getBookByIsbn`/`searchBooks` tests):
  - an `-L` id URL → `-S`/`-M`
  - an isbn-keyed URL
  - a URL with a query string
  - a non-Open Library URL → unchanged
  - empty/null → unchanged
- The helper unit tests also cover `default=false`: it is appended, it is preserved alongside an existing query string, and it is never added to non-Open Library URLs.
- **Cards view component tests** (existing test file):
  - A book with an Open Library cover renders a lazy `<img>` whose src carries `default=false`.
  - Firing the image's `error` event (standing in for Open Library's 404 on a coverless ISBN) replaces it with the existing "Add Cover" placeholder.
- **Book modal component test** (existing test file): a book whose cover errors shows the "Add Cover" button instead of the preview.
- Batch scanner/search thumbnail wiring reuses the same hook and helper, so per the "critical flows only" testing policy it gets no dedicated component tests.
- Byte savings and actual lazy-fetch behavior can't be meaningfully tested in jsdom. They are verified by hand in a real browser (DevTools Network tab, mobile emulation, scrolling a large library).

## Out of Scope

- Caching covers on our own server or in Supabase Storage. Covers keep being fetched from Open Library.
- The cover add/change/reposition UI in the book modal.
- Changing which variant gets stored in the database, or migrating existing `cover_image` values.
- Width-based `srcset` for the Cards view or the book modal. Open Library offers nothing larger than `-L`, so there is nothing to switch up to.
- Image optimization for non-Open Library cover URLs.

## Further Notes

- Verified live: with `?default=false`, an existing cover still 302-redirects to archive.org and loads, while a missing one returns `404` with an empty body, which makes `<img>` fire `error`.
- The service worker caches opaque (status 0) Open Library responses `CacheFirst` for 30 days. A missing-cover 404 fetched as an opaque image may therefore stay cached. If Open Library later gains that cover, it shows up only after the cache entry expires. This is acceptable.
- Since the render-time URLs gain a query string, every cover is fetched once more after deploy, because the cache keys differ.
- Expected impact: for a 100-book library on mobile, the first load drops from all 100 covers (~5–7 MB) to roughly the first screen's worth (a handful of covers, a few hundred KB). Batch scanner thumbnails drop from ~50–70 KB to ~2 KB (1x) or ~20 KB (2x+) each.
