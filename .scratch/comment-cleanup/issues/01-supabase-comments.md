# 01: Clean up comments in supabase/

**What to build:** Every `--` comment across `supabase/schema.sql` and all 13 files under `supabase/migrations/` is English-only and, for ordinary comments, trimmed to a title/summary level. Comments carrying operational/historical value (why a migration exists, how it must be run, why it fails/succeeds the way it does — e.g. `004_auth_step2_backfill.sql`'s explanation of its one-off manual-run history) are translated faithfully rather than aggressively trimmed. No SQL statement (`alter table`, `create table`, `create policy`, `do $$ ... $$`, etc.) changes in any way - only `--` lines are touched.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every `--` comment in `supabase/schema.sql` and `supabase/migrations/001` through `013` is in English.
- [ ] Filler comments (ones that just restate what the SQL directly below already says) are deleted per spec's filler criterion; when in doubt, kept.
- [ ] Design-rationale / constraint / operational-history comments are kept, translated, not deleted.
- [ ] `004_auth_step2_backfill.sql`'s comment retains its full operational meaning (one-off manual run, placeholder user id, why it errors instead of silently applying a wrong id) after translation.
- [ ] No SQL statement text changed anywhere in this directory - diff review confirms every changed line starts with `--`.
- [ ] `npm test && npm run lint && npm run build` all pass with identical results to before this change.
