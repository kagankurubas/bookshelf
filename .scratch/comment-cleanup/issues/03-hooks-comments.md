# 03: Clean up comments in src/hooks/

**What to build:** Every `//` comment across all files in `src/hooks/` (both the implementation files and their `*.test.js` files) is English-only and trimmed to a title/summary level, except where a comment carries a genuine design rationale or constraint, which is translated and kept rather than deleted. The 11 `// eslint-disable-next-line ...` directive lines in this directory are left byte-for-byte unchanged (they affect lint behavior, they are not documentation); the explanatory comment usually sitting above each one follows the normal rule. No code line changes - only comment text.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every `//` comment in `src/hooks/*.js` and `src/hooks/*.test.js` is in English.
- [ ] Filler comments are deleted per spec's filler criterion; when in doubt, kept.
- [ ] Design-rationale / constraint comments are kept, translated, not deleted.
- [ ] All `// eslint-disable-next-line ...` lines in this directory are unchanged.
- [ ] No non-comment line changed anywhere in this directory - diff review confirms every changed line starts with `//` (or is a comment continuation).
- [ ] `npm test && npm run lint && npm run build` all pass with identical results to before this change.
