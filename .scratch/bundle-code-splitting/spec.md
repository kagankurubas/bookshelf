Status: ready-for-agent

# Bundle size: feature code splitting + vendor chunks

## Decision

Approved scope: **A + B**. C and D are explicitly not done (see Out of Scope).

## Verdict (read this first)

The 604 kB main chunk is **mostly code the app needs before first render**. react-dom and the Supabase auth + query clients account for ~70% of it, and the code shows none of that can be deferred. What *is* movable is modest:

| Option | First-load saving (gzip) | Other benefit | Risk | Recommendation |
|---|---|---|---|---|
| A. Lazy-load Settings / Dashboard / AI chat | **−22 kB** (183 → 161, −12%) | – | Low: existing pattern | **Do it** |
| B. Vendor chunks (react, supabase) | 0 kB | Removes the 500 kB warning; a deploy that changes only app code re-downloads ~65 kB gzip instead of ~175 kB | Very low: build config only | **Do it** |
| C. Stub out unused Supabase realtime/storage via alias | −22 kB | – | Medium: couples startup to supabase-js internals | Don't, for now |
| D. Build the Supabase client from individual sub-packages | ~−22 kB | – | High: re-implements auth-header wiring for every RLS query | Don't |
| E. Defer react-dom / auth-js | impossible | – | – | – |

A + B is a real, low-risk ticket, but not a dramatic one: first load drops by 12%. A returning PWA user loads everything from the service worker cache and barely notices A. B mainly helps after each deploy, which happens often: 84 commits in the last 30 days. The first-load saving matters mostly for a first visit on a slow mobile connection.

If "12% first-load and cheaper updates" isn't worth a PR right now, dropping the ticket is a defensible call. Nothing here is a performance problem users report.

The original task text assumed `html5-qrcode` and a client-side Gemini library. Neither applies:

- Barcode scanning uses `zxing-wasm`, and both scanner components are **already** lazy chunks.
- Gemini runs in the `ai-chat` Supabase Edge Function. The client-side AI chat drawer is ~5 kB.

## Research findings

### What the main chunk contains

These are minified bytes, attributed via the source map (589 of 604 kB mapped).

| Group | Size | Needed before first render? |
|---|---|---|
| react-dom + scheduler | ~178 kB | **Yes.** `main.jsx` calls `createRoot(...).render` on load. |
| `@supabase/auth-js` | 94 kB | **Yes.** `useAuth` calls `supabase.auth.getSession()` and `onAuthStateChange` on mount. `AuthGate` renders nothing useful until they resolve. |
| `@supabase/postgrest-js` | 15 kB | **Yes.** `useBooks`/`useLibraries` query right after auth. |
| `@supabase/realtime-js` + `phoenix` | 55 kB | **No, never used.** No `.channel()` anywhere in `src/`. |
| `@supabase/storage-js` + `iceberg-js` | 26 kB | **No, never used.** No `.storage` anywhere in `src/`. |
| `@supabase/functions-js` | 3 kB | Only in AI chat and account deletion (too small to matter). |
| `@supabase/supabase-js` wrapper | 10 kB | Yes |
| i18next + detector + react-i18next + locale resources | ~70 kB | Yes (out of scope) |
| Settings subtree (papaparse, import/export libs, ImportPreview/DeleteAccount modals) | ~35 kB | No, only when Settings opens |
| Dashboard subtree (html-to-image, ReadingRecap, charts, dashboard-only stats hooks) | ~28 kB | No, only in the Dashboard view |
| AI chat subtree | ~5 kB | No, only when the drawer opens |

### Why the unused Supabase modules can't simply be tree-shaken

`@supabase/supabase-js` (2.112.4) constructs every sub-client eagerly in the `SupabaseClient` constructor:

- `this.realtime = this._initRealtimeClient(...)`
- `this.storage = new StorageClient(...)`

`auth-js` holds a live reference and calls `this.realtime.setAuth(token)` on every auth state change. Because those classes are instantiated, the bundler must keep them. The only ways to remove them are option C or option D below.

### Experiments (throwaway builds, nothing committed)

| Build | Initial JS (raw) | Initial JS (gzip) | Main-chunk warning |
|---|---|---|---|
| Current (`main`) | ~623 kB | ~183 kB | yes (604 kB chunk) |
| A: lazy Settings/Dashboard/AI chat | ~556 kB | ~161 kB | no (Supabase moves into its own shared chunk) |
| B: vendor groups only | ~623 kB | ~183 kB | no. `react-vendor` 60 kB, `supabase-vendor` 54 kB, `index` 64 kB (gzip) |
| C: realtime/storage aliased to stubs | ~540 kB | ~161 kB | yes (521 kB chunk) |

- "Initial JS" is the entry script plus everything `index.html` `modulepreload`s.
- Vite emits `<link rel="modulepreload">` for every initial chunk, so splitting adds parallel requests, not a waterfall.
- Lazy chunks produced by A: `SettingsModal` 11 kB, `DashboardPage` 9.5 kB, `AiChatDrawer` 1.7 kB (gzip).

### PWA precache: no conflict

- Code splitting only changes *what must be fetched and evaluated before first render*.
- The service worker precache (`globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}']`) still downloads **every** chunk in the background, including new lazy chunks, the vendor chunks, and the 1.09 MB barcode `.wasm`.

The earlier decision to precache the wasm for offline scanning is untouched, and every feature still opens offline once the SW has installed. Total first-visit bytes (critical path + background precache) stay the same.

B also helps precache updates: files are content-hashed, so after a deploy that only changes app code, the SW re-fetches the ~65 kB gzip app chunk instead of the whole bundle.

## Problem Statement

On a first visit, and after every deploy, the app downloads and evaluates ~183 kB gzip of JS in one piece before showing anything. That includes settings/import-export, the stats dashboard with its image export, and the AI chat UI, even though most sessions open none of them. Because everything sits in one chunk, any app-code change invalidates the whole bundle for returning PWA users.

## Solution (recommended scope: A + B)

1. **Lazy-load three feature subtrees** at their existing component boundary in the app shell, using the same `lazy()` + `<Suspense>` pattern the scanners already use: Settings, Dashboard, AI chat.
2. **Split vendor code into stable chunks**: one for React (react, react-dom, scheduler) and one for Supabase (`@supabase/*`), via the Rolldown `codeSplitting.groups` output option in the Vite config.

## User Stories

1. As a first-time mobile visitor, I want less JavaScript on the startup path, so that my library appears sooner on a slow connection.
2. As a user who doesn't open Settings in a session, I want import/export code not to load on startup, so that I don't pay for a feature I'm not using.
3. As a user who stays in the Cards/Table/Shelf views, I want dashboard charts and the image-export library not to load on startup, so that the default view renders faster.
4. As a returning PWA user, I want an app update to re-download only the code that changed, so that updates cost less mobile data.
5. As a user opening Settings, I want it to appear as quickly as today, so that the split isn't noticeable.
6. As a user switching to the Dashboard view, I want a brief loading text rather than a blank area if the chunk takes a moment, so that I know it's loading.
7. As a user opening AI chat, I want the drawer to open as it does today.
8. As an offline PWA user, I want Settings, the Dashboard, AI chat and the barcode scanner to keep opening offline, so that splitting doesn't break offline use.
9. As an offline user, I want the barcode engine to remain precached exactly as before.
10. As a Reading Recap user, I want image export and Web Share to keep working after html-to-image moves into a lazy chunk.
11. As a developer, I want new lazy boundaries to follow the existing scanner pattern, so that there's one way to code-split in this codebase.
12. As a developer, I want the build to stop emitting the >500 kB chunk warning, so that a real regression stands out when it happens.

## Implementation Decisions

- **Lazy boundaries**:
  - Add three `lazy()` declarations next to the existing scanner ones in the app shell, for SettingsModal, DashboardPage and AiChatDrawer.
  - Wrap each render site in `<Suspense>`.
  - The components themselves are unchanged, and `ReadingStats` stays eager because non-dashboard views use it too.
- **Fallbacks**:
  - Settings and AI chat use `fallback={null}`, the same as the scanners. They are overlays, and a chunk served from the SW precache arrives in milliseconds.
  - The Dashboard uses the existing `.app-loading-text` "Yükleniyor…" pattern, because it replaces the whole main area.
- **No library-level dynamic imports**: `papaparse` and `html-to-image` leave the main chunk through the component boundary. Their call sites stay synchronous or unchanged. This avoids adding an `await` between the tap and `navigator.share()` in the Recap flow, which Safari's user-activation rule is sensitive to.
- **Vendor groups**:
  - Add `react-vendor` (react, react-dom, scheduler) and `supabase-vendor` (`@supabase/*`, `iceberg-js`) to the Rolldown `codeSplitting.groups` config. These were verified to build with Vite 8.1.
  - Leave `chunkSizeWarningLimit` at its default, so that the warning disappearing is a real signal.
- **No PWA config changes**: `globPatterns` and runtime caching stay as they are.

## Testing Decisions

- A good test checks what the user sees, not chunk structure.
- **One App-level test** in the existing app shell test file, using its existing mocks. From the logged-in app it switches to the Dashboard view and opens Settings, awaiting each with `findBy…`, since lazy components resolve on a later tick. It also opens AI chat. The test catches broken lazy wiring, for example a component losing its `default` export. The build still succeeds in that case, but the app throws at runtime. This was verified by mutating the Settings import: the build passed and the test failed.
  - Note: a *missing* `<Suspense>` is **not** a crash in React 19's concurrent root. React keeps the previous UI until the chunk loads, which was verified by removing the Settings boundary: the tests still passed and nothing blanked. The boundaries exist to show a fallback (the Dashboard's loading text) and to scope where suspending applies. No test asserts them.
- Existing component and lib tests are unchanged, because they import modules directly.
- Bundle shape is verified from `npm run build` output against the table above, not asserted in tests.
- Manual browser checks:
  - Open each feature online.
  - Open each feature offline after the SW has installed.
  - Try the Recap share on mobile.
  - Confirm that a second deploy only re-fetches the app chunk (DevTools → Application → Cache Storage).

## Out of Scope

- **C: stubbing `@supabase/realtime-js` / `@supabase/storage-js` via resolve aliases.** It saves ~22 kB gzip, but it makes app startup depend on which methods supabase-js calls on those clients internally (today: `setAuth`, `channel`, …). A supabase-js upgrade that calls something new would crash the app on load with an obscure error. Revisit if first-load size becomes a real complaint.
- **D: replacing `createClient` with hand-wired `AuthClient` + `PostgrestClient` + `FunctionsClient`.** Every RLS-protected query depends on the access-token/apikey header wiring and token-refresh behavior that supabase-js provides. Re-implementing it risks auth and data bugs for the same ~22 kB.
- **Deferring react-dom or auth-js.** Both are required for first render, as shown above. Swapping React for Preact is not considered.
- Splitting i18next or locale resources.
- Changes to the barcode scanner split or the wasm precache.
- Route-level splitting (the app has no routes).

## Further Notes

- **Chunk-load failure** is an existing risk that the scanners already carry. There is no error boundary, so a lazy import that fails crashes the tree. That happens when the app goes offline before the SW has finished precaching, or when an old tab requests a chunk removed by a newer deploy. Three more lazy boundaries widen the exposure slightly. A small app-level error boundary with a "reload" prompt would be a sensible separate ticket.
- All sizes above come from local builds of the current `main` on 2026-09-23. The implementation PR should include its own before/after build output.
