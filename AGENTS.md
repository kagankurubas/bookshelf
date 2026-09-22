## Branch/PR discipline

Every feature or fix, however small, starts on its own branch off `main` — never directly in `main`'s working tree, and never committed straight to `main`.

1. Branch off `main` first: `git checkout -b <feature-slug>`.
2. Make and commit changes on that branch. `main` never accumulates uncommitted changes.
3. Push to `origin` and open a draft PR.
4. Don't merge until CI (build + rls-integration-tests) is green.
5. Run `/code-review` with fixed point `main`; address what it finds.
6. Ask the user to verify by hand in a real browser, especially anything automated tests can't fully cover (DB/RLS, service worker/cache).
7. Only then squash-merge into `main`.
8. Clean up the branch/worktree after merge.

No exceptions for "it's a small change" or "just a one-line fix." If you find a sign that a prior session skipped this (uncommitted changes sitting in `main`'s working tree, or `main` diverged from `origin/main`), tell the user before doing anything else, propose a fix, and don't proceed without their approval.

## Commit and comment language/style

Commit messages are always written in English, even when the conversation itself is in Turkish, and new code comments are English-only and minimal — a comment adds only a "what this does" summary the code doesn't already make obvious, never a restatement of what the code already says. This isn't retroactive: existing Turkish commit history and existing Turkish comments are left as they are.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Supabase migrations

Production's migration history can silently disagree with what `supabase migration list` reports. See `docs/agents/supabase-migrations.md`.
