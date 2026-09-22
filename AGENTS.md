## Commit and comment language/style

Commit messages are always written in English, even when the conversation itself is in Turkish, and new code comments are English-only and minimal — a comment adds only a "what this does" summary the code doesn't already make obvious, never a restatement of what the code already says. This isn't retroactive: existing Turkish commit history and existing Turkish comments are left as they are.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
