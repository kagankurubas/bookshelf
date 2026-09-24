import { describe, expect, it, vi } from 'vitest'
import { fileURLToPath } from 'node:url'
import { runChecks } from '../index.js'
import { createFixtureRepo } from '../test/fixtureRepo.js'
import {
  ALLOWED_COMMANDS,
  POLICIES_QUERY,
  VERSIONS_QUERY,
  assertAllowed,
  createLinkedMigrationsCheck,
  defaultRunner,
  linkedMigrations,
} from './linkedMigrations.js'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))

const MIGRATIONS = {
  'supabase/migrations/001_books.sql': `
create table books (id uuid primary key, user_id uuid);
alter table books enable row level security;
create policy "own books" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
`,
  'supabase/migrations/002_notes.sql': `
create table notes (id uuid primary key, book_id uuid);
alter table notes enable row level security;
create policy "own notes" on notes for all
  using (exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid()));
`,
}
const EXCEPTIONS = {
  policylessTables: [],
  securityDefinerFunctions: [],
  ownershipChains: [{ table: 'notes', parents: ['books'], reason: 'owned through its book' }],
  localDemoJwtIssuers: [],
}

// pg_policies as Postgres deparses it.
const BOOKS_ROW = { tablename: 'books', policyname: 'own books', cmd: 'ALL', qual: '(auth.uid() = user_id)', with_check: '(auth.uid() = user_id)' }
const NOTES_ROW = {
  tablename: 'notes',
  policyname: 'own notes',
  cmd: 'ALL',
  qual: '(EXISTS ( SELECT 1\n   FROM books b\n  WHERE ((b.id = notes.book_id) AND (b.user_id = auth.uid()))))',
  with_check: null,
}
const VERSIONS = [{ version: '001' }, { version: '002' }]

const ok = (rows) => ({ code: 0, stdout: JSON.stringify(rows), stderr: '' })

function fakeRunner({ versions = ok(VERSIONS), policies = ok([BOOKS_ROW, NOTES_ROW]) } = {}) {
  return vi.fn(async (args) => {
    const sql = args.at(-1)
    if (sql === VERSIONS_QUERY) return typeof versions === 'function' ? versions() : versions
    if (sql === POLICIES_QUERY) return typeof policies === 'function' ? policies() : policies
    throw new Error(`unexpected command ${args.join(' ')}`)
  })
}

async function run(runner, { linked = true } = {}) {
  const root = createFixtureRepo(MIGRATIONS)
  return runChecks({ root, linked, checks: [createLinkedMigrationsCheck({ runner })], exceptions: EXCEPTIONS })
}

const failures = (results) => results.filter((r) => r.status === 'fail')

describe('Wall 4: production migration history (--linked)', () => {
  it('skips without --linked and never calls the CLI runner', async () => {
    const runner = fakeRunner()
    const results = await run(runner, { linked: false })
    expect(results.map((r) => [r.status, r.message])).toEqual([['skip', 'use --linked for the production check']])
    expect(runner).not.toHaveBeenCalled()
  })

  it('is registered and skips on the real repository without --linked', async () => {
    const results = (await runChecks({ root: repoRoot })).filter((r) => r.check === linkedMigrations.id)
    expect(results.map((r) => r.status)).toEqual(['skip'])
  })

  it('passes when production matches the migrations, using only allow-listed commands', async () => {
    const runner = fakeRunner()
    const results = await run(runner)
    expect(failures(results)).toEqual([])
    expect(results.filter((r) => r.status === 'pass')).toHaveLength(2)
    for (const [args] of runner.mock.calls) expect(ALLOWED_COMMANDS).toContainEqual(args)
  })

  it('fails on a version missing in production and on one only production has', async () => {
    const results = failures(await run(fakeRunner({ versions: ok([{ version: '001' }, { version: '20260101000000' }]) })))
    expect(results.map((r) => [r.message, r.file])).toEqual([
      ['migration 002 is not recorded in production schema_migrations', 'supabase/migrations/002_notes.sql'],
      ['production schema_migrations has version 20260101000000, which no local migration file has', undefined],
    ])
  })

  it('fails on a missing policy, a policy without auth.uid() and one without its parent table', async () => {
    const results = failures(
      await run(
        fakeRunner({
          policies: ok([
            { ...BOOKS_ROW, qual: 'true', with_check: null },
            { ...NOTES_ROW, policyname: 'Allow all' },
          ]),
        }),
      ),
    )
    expect(results.map((r) => r.message)).toEqual([
      'production policy "own books" on books: using expression does not reference auth.uid()',
      'policy "own notes" on notes is missing in production pg_policies',
      'production has policy "Allow all" on notes, which the migrations do not define',
    ])
    const orphan = failures(await run(fakeRunner({ policies: ok([BOOKS_ROW, { ...NOTES_ROW, qual: '(user_id = auth.uid())' }]) })))
    expect(orphan.map((r) => r.message)).toEqual([
      'production policy "own notes" on notes: using expression does not reference parent table books',
    ])
    expect(orphan[0].file).toBe('supabase/migrations/002_notes.sql')
  })

  it('skips with a how-to when the CLI is not linked, logged in or installed', async () => {
    const notLinked = await run(fakeRunner({ versions: { code: 1, stdout: '', stderr: 'Cannot find project ref. Have you run supabase link?' } }))
    expect(notLinked.map((r) => r.status)).toEqual(['skip'])
    expect(notLinked[0].message).toContain('Have you run supabase link?')
    expect(notLinked[0].message).toContain('npx supabase link')

    const missing = await run(fakeRunner({ versions: () => { throw new Error('spawn npx ENOENT') } }))
    expect(missing.map((r) => r.status)).toEqual(['skip'])
    expect(missing[0].message).toContain('npx supabase login')
  })

  it('reads rows wrapped in an object with surrounding noise, and fails on unparseable output', async () => {
    const wrapped = { code: 0, stdout: `A new version of Supabase CLI is available\n${JSON.stringify({ rows: VERSIONS })}\n`, stderr: '' }
    expect(failures(await run(fakeRunner({ versions: wrapped })))).toEqual([])

    const garbled = failures(await run(fakeRunner({ versions: { code: 0, stdout: 'version\n001\n002', stderr: '' } })))
    expect(garbled.map((r) => r.message)).toEqual(['check threw: no JSON found in Supabase CLI output'])
  })

  it('rejects any command outside the allow-list before spawning', () => {
    for (const args of [
      ['db', 'push', '--linked'],
      ['migration', 'repair', '--status', 'applied', '001', '--linked'],
      ['migration', 'list', '--linked'],
      ['db', 'query', '--linked', '--output', 'json', 'delete from supabase_migrations.schema_migrations'],
      ['db', 'query', '--linked', '--output', 'json', `${VERSIONS_QUERY}; drop table books`],
      ['db', 'query', '--output', 'json', VERSIONS_QUERY],
    ]) {
      expect(() => assertAllowed(args), args.join(' ')).toThrow(/not allow-listed/)
      expect(() => defaultRunner(args, { cwd: repoRoot }), args.join(' ')).toThrow(/not allow-listed/)
    }
  })
})
