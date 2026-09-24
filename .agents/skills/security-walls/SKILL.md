---
name: security-walls
description: "Run BookShelf's security walls check, explain its results, and guide adding a new wall."
disable-model-invocation: true
---

The walls live in `scripts/security-walls/`. The script is the single source of truth for what each wall checks: read a wall's module in `checks/` when you need its rules, and explain from there. CI already runs the check on every PR; this skill is for a closer look by hand.

## Run and report

1. Run `npm run check:security`. Output is grouped per wall: `[PASS|FAIL|SKIP] <wall name>`, then one line per result with `file:line` when there is one. Exit code 1 means at least one FAIL.
2. Report every FAIL with its wall name, its `file:line`, and its likely cause. Find the cause by reading the wall's module in `checks/` alongside the flagged file. The step is done when each FAIL has all three.
3. List the SKIPs with the reason the script printed. `Production migration history (--linked)` always skips without `--linked`, and `Secret leakage` skips its `dist/` scan when there is no build.
4. Propose a fix for each FAIL as a separate ticket or spec (`/to-spec`), and leave the code as it is. When a FAIL is a deliberate choice rather than a hole, propose an entry in `scripts/security-walls/exceptions.js` with its reason, and let the user decide.

## `--linked`

`npm run check:security -- --linked` also runs the `Production migration history (--linked)` wall. It compares production's `schema_migrations` and `pg_policies` with the local migrations, the automated form of `docs/agents/supabase-migrations.md`.

- It is read-only: the script runs only its allow-listed `supabase db query --linked` reads, never `migration repair`, `db push` or a write.
- It needs production credentials: a Supabase CLI login and a link to the production project (`npx supabase login`, `npx supabase link --project-ref <ref>`). Without them the wall skips and prints how to link.
- Run it only when the user asks for it, typically around a migration push or when production drift is suspected. CI never runs it.

## Adding a new wall

A new wall is one module plus one registry line.

- **Module**: `scripts/security-walls/checks/<name>.js` exports `{ id, title, run(ctx) }`. `id` is a stable kebab-case key. `title` is the wall name shown in output: short, descriptive, sentence case, like the existing ones. `run` returns a non-empty list of `{ status: 'pass' | 'fail' | 'skip', message, file?, line? }`; a throw or empty list becomes a FAIL. Shared inputs (`root`, `linked`, `exceptions`, `trackedFiles`, `migrations`, `readFile`, and the binary-safe `readText` that returns null for a missing or binary file) come from `createContext` in `index.js`.
- **Registry**: add one line to `scripts/security-walls/registry.js`. Walls run in that order.
- **Exceptions**: deliberate exceptions and expectations go in `scripts/security-walls/exceptions.js`, each with a non-empty `reason`, never hard-coded in the module.
- **Bad-example test (required)**: `checks/<name>.test.js` builds a small broken fixture with `createFixtureRepo` from `scripts/security-walls/test/fixtureRepo.js`, runs `runChecks({ root, checks: [wall], exceptions })`, and asserts the wall FAILs with the right `file`. One test per rule the wall enforces, so a wall that silently passes goes red. The existing "has no failing wall" test in `security-walls.test.js` then confirms the real repo stays clean.

The wall is done when `npm test`, `npm run lint` and `npm run check:security` all pass.
