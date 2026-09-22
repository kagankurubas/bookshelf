# 02: Clean up comments in src/lib/

**What to build:** Every `//` comment across all files in `src/lib/` (both the implementation files and their `*.test.js` files) is English-only and trimmed to a title/summary level, except where a comment carries a genuine design rationale or constraint, which is translated and kept rather than deleted. No code line (variable/function/file names, logic, string literals) changes - only comment text.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every `//` comment in `src/lib/*.js` and `src/lib/*.test.js` is in English.
- [ ] Filler comments (ones that just restate what the code directly below already says) are deleted per spec's filler criterion; when in doubt, kept.
- [ ] Design-rationale / constraint comments are kept, translated, not deleted.
- [ ] No non-comment line changed anywhere in this directory - diff review confirms every changed line starts with `//` (or is a comment continuation).
- [ ] `npm test && npm run lint && npm run build` all pass with identical results to before this change.
