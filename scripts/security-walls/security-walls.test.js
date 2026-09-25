import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { runChecks } from './index.js'
import { main } from './cli.js'
import { createFixtureRepo } from './test/fixtureRepo.js'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

const passing = (id, title = id) => ({ id, title, run: () => [{ status: 'pass', message: 'ok' }] })

// Captures ctx through the public seam instead of reaching into internals.
async function contextFor(root, options = {}) {
  let captured
  const probe = {
    id: 'probe',
    title: 'Probe',
    run: (ctx) => {
      captured = {
        root: ctx.root,
        linked: ctx.linked,
        trackedFiles: ctx.trackedFiles,
        migrations: ctx.migrations,
      }
      return [{ status: 'pass', message: 'captured' }]
    },
  }
  const results = await runChecks({ root, checks: [probe], ...options })
  expect(results.filter((r) => r.status === 'fail')).toEqual([])
  return captured
}

describe('runChecks', () => {
  it('runs checks in registry order and tags each result with its check', async () => {
    const results = await runChecks({
      root: createFixtureRepo(),
      checks: [
        passing('a', 'Wall A'),
        { id: 'b', title: 'Wall B', run: () => [{ status: 'fail', message: 'broken', file: 'x.sql', line: 3 }] },
      ],
    })
    expect(results).toEqual([
      { check: 'a', title: 'Wall A', status: 'pass', message: 'ok' },
      { check: 'b', title: 'Wall B', status: 'fail', message: 'broken', file: 'x.sql', line: 3 },
    ])
  })

  it('turns a throwing, empty or malformed check into a FAIL and keeps going', async () => {
    const results = await runChecks({
      root: createFixtureRepo(),
      checks: [
        { id: 'throws', title: 'Throws', run: () => { throw new Error('boom') } },
        { id: 'rejects', title: 'Rejects', run: async () => { throw new Error('async boom') } },
        { id: 'empty', title: 'Empty', run: () => [] },
        { id: 'malformed', title: 'Malformed', run: () => [{ status: 'ok' }] },
        passing('after'),
      ],
    })
    expect(results.map((r) => [r.check, r.status])).toEqual([
      ['throws', 'fail'],
      ['rejects', 'fail'],
      ['empty', 'fail'],
      ['malformed', 'fail'],
      ['after', 'pass'],
    ])
    expect(results[0].message).toContain('boom')
  })

  it('fails an exception entry without a reason', async () => {
    const results = await runChecks({
      root: createFixtureRepo(),
      checks: [],
      exceptions: { policylessTables: [{ table: 'audit_log' }, { table: 'ok', reason: 'documented' }] },
    })
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ status: 'fail', message: expect.stringContaining('policylessTables[0]') })
  })
})

describe('ctx', () => {
  it('carries root, linked and only git-tracked files', async () => {
    const root = createFixtureRepo({ 'src/app.js': '', 'README.md': '' }, { untracked: { '.env': 'SECRET=1' } })
    const ctx = await contextFor(root, { linked: true })
    expect(ctx.linked).toBe(true)
    expect(ctx.root).toBe(root)
    expect(ctx.trackedFiles.sort()).toEqual(['README.md', 'src/app.js'])
  })

  it('reports the final state of a policy dropped and recreated in a later migration', async () => {
    const root = createFixtureRepo({
      'supabase/migrations/001_init.sql': `
create table if not exists books (id uuid primary key, user_id uuid);
create table public.book_libraries (book_id uuid, library_id uuid);
create table scratch (id int);
alter table books enable row level security;
alter table public.book_libraries enable row level security;
create policy "Allow all on books" on books for all using (true);
create policy "Users manage own book_libraries" on book_libraries
  for all using (true);
`,
      // Numeric ordering: 2 must apply before 10.
      'supabase/migrations/2_tighten.sql': `
-- drop policy "Users manage own book_libraries" on book_libraries; (comment, ignored)
drop policy if exists "Allow all on books" on books;
drop policy if exists "Users manage own book_libraries" on book_libraries;
create policy "Users manage own book_libraries" on book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
drop table if exists scratch;
`,
      'supabase/migrations/10_library_owner.sql': `
drop policy if exists "Users manage own book_libraries" on book_libraries;

create policy "Users manage own book_libraries" on public.book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  );

create or replace function bump(p int) returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security invoker; inside the body, must not count
  return p + 1;
end;
$$;

create or replace function plain() returns int language sql security invoker as $fn$ select 1; $fn$;
`,
    })
    const { migrations } = await contextFor(root)

    expect(migrations.files).toEqual([
      'supabase/migrations/001_init.sql',
      'supabase/migrations/2_tighten.sql',
      'supabase/migrations/10_library_owner.sql',
    ])
    expect([...migrations.policies.keys()]).toEqual(['book_libraries:Users manage own book_libraries'])
    const policy = migrations.policies.get('book_libraries:Users manage own book_libraries')
    expect(policy).toMatchObject({ table: 'book_libraries', command: 'all', file: 'supabase/migrations/10_library_owner.sql', line: 4 })
    expect(policy.using).toMatch(/^exists \(select 1 from books b .*\n\s+and exists \(select 1 from libraries l .*\)$/s)
    expect(policy.withCheck).toBe('exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())')

    expect([...migrations.tables.keys()]).toEqual(['books', 'book_libraries'])
    expect(migrations.tables.get('books')).toMatchObject({ rls: true, file: 'supabase/migrations/001_init.sql', line: 2 })

    expect(migrations.functions.get('bump')).toMatchObject({ securityDefiner: true, searchPath: true, line: 12 })
    expect(migrations.functions.get('plain')).toMatchObject({ securityDefiner: false, searchPath: false })
  })

  it('reads the real migrations to their final state', async () => {
    const { migrations } = await contextFor(repoRoot)
    const bookLibraries = migrations.policies.get('book_libraries:Users manage own book_libraries')
    expect(bookLibraries.file).toBe('supabase/migrations/011_book_libraries_check_library_owner.sql')
    expect(bookLibraries.using).toContain('from libraries l')
    expect(bookLibraries.withCheck).toContain('from libraries l')
    expect([...migrations.policies.values()].some((p) => p.name.startsWith('Allow all'))).toBe(false)
    for (const table of ['libraries', 'books', 'book_libraries', 'notes', 'ai_conversations', 'ai_messages', 'ai_daily_usage']) {
      expect(migrations.tables.get(table)?.rls, table).toBe(true)
    }
    const quota = migrations.functions.get('try_consume_ai_quota')
    expect(quota).toMatchObject({ securityDefiner: true, searchPath: true, params: '', otherSignatures: [] })
    expect([...quota.executeGrantees]).toEqual(['service_role'])
    expect(migrations.functions.get('get_reading_stats')).toMatchObject({
      securityDefiner: false,
      file: 'supabase/migrations/009_dashboard_stats.sql',
    })
  })
})

describe('CLI', () => {
  const run = async (argv, checks) => {
    let output = ''
    const code = await main(argv, { checks, write: (text) => { output += text } })
    return { code, output }
  }

  it('groups results by wall and exits 1 when any check fails', async () => {
    const root = createFixtureRepo()
    const { code, output } = await run(['--root', root], [
      passing('a', 'Wall A'),
      { id: 'b', title: 'Wall B', run: () => [{ status: 'fail', message: 'broken', file: 'x.sql', line: 3 }] },
    ])
    expect(code).toBe(1)
    expect(output).toContain('[PASS] Wall A')
    expect(output).toContain('[FAIL] Wall B\n  FAIL x.sql:3 - broken')
    expect(output).toContain('1 passed, 1 failed, 0 skipped')
  })

  it('accepts --linked and exits 0 without failures', async () => {
    const linkedWall = { id: 'l', title: 'Linked', run: (ctx) => [{ status: ctx.linked ? 'pass' : 'skip', message: 'x' }] }
    expect((await run(['--root', createFixtureRepo(), '--linked'], [linkedWall])).output).toContain('[PASS] Linked')
    expect((await run(['--root', createFixtureRepo()], [linkedWall])).code).toBe(0)
  })

  it('rejects unknown arguments', async () => {
    expect((await run(['--bogus'], [])).code).toBe(2)
  })
})

describe('real repository', () => {
  it('has no failing wall', async () => {
    const results = await runChecks({ root: repoRoot })
    expect(results.filter((r) => r.status === 'fail')).toEqual([])
  })
})
