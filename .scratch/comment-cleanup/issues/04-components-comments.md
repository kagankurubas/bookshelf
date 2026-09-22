# 04: Clean up comments in src/components/, App.jsx, src/test/setup.js

**What to build:** Every `//` comment across all files in `src/components/` (both implementation files and their `*.test.jsx` files), plus `src/App.jsx` and `src/test/setup.js`, is English-only and trimmed to a title/summary level, except where a comment carries a genuine design rationale or constraint, which is translated and kept rather than deleted. The 2 `// eslint-disable-next-line ...` directive lines in this scope (`BarcodeScanner.jsx`, `ImportPreviewModal.jsx`) are left byte-for-byte unchanged. No code line changes - only comment text.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every `//` comment in `src/components/**/*.jsx`, `src/components/**/*.test.jsx`, `src/App.jsx`, and `src/test/setup.js` is in English.
- [ ] Filler comments are deleted per spec's filler criterion; when in doubt, kept.
- [ ] Design-rationale / constraint comments are kept, translated, not deleted.
- [ ] The `// eslint-disable-next-line ...` lines in `BarcodeScanner.jsx` and `ImportPreviewModal.jsx` are unchanged.
- [ ] No non-comment line changed anywhere in this scope - diff review confirms every changed line starts with `//` (or is a comment continuation).
- [ ] `npm test && npm run lint && npm run build` all pass with identical results to before this change.
