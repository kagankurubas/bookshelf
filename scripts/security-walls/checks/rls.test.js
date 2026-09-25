import { describe, expect, it } from 'vitest'
import { runChecks } from '../index.js'
import { createFixtureRepo } from '../test/fixtureRepo.js'
import { rlsCheck } from './rls.js'

const owned = (table) =>
  `create policy "own ${table}" on ${table} for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`

// A minimal schema that satisfies the real exceptions config.
const GOOD_SCHEMA = `
create table libraries (id uuid primary key, user_id uuid);
create table books (id uuid primary key, user_id uuid);
create table book_libraries (book_id uuid, library_id uuid);
create table notes (id uuid primary key, book_id uuid);
create table ai_conversations (id uuid primary key, user_id uuid);
create table ai_messages (id uuid primary key, conversation_id uuid);
create table ai_daily_usage (user_id uuid, day date, request_count int);

alter table libraries enable row level security;
alter table books enable row level security;
alter table book_libraries enable row level security;
alter table notes enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table ai_daily_usage enable row level security;

${owned('libraries')};
${owned('books')};
${owned('ai_conversations')};
create policy "own book_libraries" on book_libraries for all using (
  exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
) with check (
  exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
);
create policy "own notes" on notes for all
  using (exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid()));
create policy "own ai_messages" on ai_messages for all
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create or replace function try_consume_ai_quota(p_max_requests int) returns boolean
language plpgsql security definer set search_path = public
as $$ begin return true; end; $$;
create or replace function refund_ai_quota() returns void
language plpgsql security definer set search_path = public
as $$ begin end; $$;
`

async function rlsResults(extraMigration, { schema = GOOD_SCHEMA } = {}) {
  const files = { 'supabase/migrations/001_init.sql': schema }
  if (extraMigration) files['supabase/migrations/002_change.sql'] = extraMigration
  return runChecks({ root: createFixtureRepo(files), checks: [rlsCheck] })
}

const failures = (results) => results.filter((r) => r.status === 'fail')

describe('RLS wall', () => {
  it('passes a schema that meets every rule', async () => {
    const results = await rlsResults()
    expect(failures(results)).toEqual([])
    expect(results[0].status).toBe('pass')
  })

  it('fails a table without row level security, naming its migration', async () => {
    const results = await rlsResults('create table shelves (id uuid primary key, user_id uuid);')
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('shelves'), file: 'supabase/migrations/002_change.sql', line: 1 }),
    ])
  })

  it('fails a table whose RLS a later migration disables', async () => {
    const results = await rlsResults('\nalter table books disable row level security;')
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('books'), file: 'supabase/migrations/002_change.sql', line: 2 }),
    ])
  })

  it('fails an RLS table with no policies that is not an exception', async () => {
    const results = await rlsResults('drop policy "own books" on books;')
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/books .*no policies/), file: 'supabase/migrations/001_init.sql' }),
    ])
  })

  it('fails a policy whose expressions never use auth.uid()', async () => {
    const results = await rlsResults(`
drop policy "own libraries" on libraries;
create policy "Allow all on libraries" on libraries for all using (true);`)
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/Allow all on libraries.*auth\.uid\(\)/), file: 'supabase/migrations/002_change.sql', line: 3 }),
    ])
  })

  it('fails an extra permissive policy even when another policy uses auth.uid()', async () => {
    const results = await rlsResults('create policy "read all books" on books for select using (true);')
    expect(failures(results)).toHaveLength(1)
    expect(failures(results)[0].message).toContain('read all books')
  })

  it('fails book_libraries when its policy stops checking libraries (migration 011 regression)', async () => {
    const results = await rlsResults(`
drop policy if exists "own book_libraries" on book_libraries;
create policy "own book_libraries" on book_libraries for all using (
  exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
);`)
    const failed = failures(results)
    expect(failed).toHaveLength(2)
    for (const result of failed) {
      expect(result).toMatchObject({ file: 'supabase/migrations/002_change.sql', line: 3 })
      expect(result.message).toContain('parent table libraries')
    }
  })

  it('fails an indirectly owned table whose policy skips its parent', async () => {
    const results = await rlsResults(`
drop policy "own notes" on notes;
create policy "own notes" on notes for all using (auth.uid() is not null);`)
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('parent table books') }),
    ])
  })

  it('fails a security definer function without set search_path', async () => {
    const results = await rlsResults(`
create or replace function try_consume_ai_quota(p_max_requests int) returns boolean
language plpgsql security definer
as $$ begin return true; end; $$;`)
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('search_path'), file: 'supabase/migrations/002_change.sql', line: 2 }),
    ])
  })

  it('fails a security definer function that is not in the exceptions list', async () => {
    const results = await rlsResults(`
create function wipe_everything() returns void
language sql security definer set search_path = public
as $$ delete from books; $$;`)
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('wipe_everything is not in exceptions'), line: 2 }),
    ])
  })

  it('fails alter policy and alter function instead of ignoring them', async () => {
    const results = await rlsResults(`
alter policy "own books" on books using (true);
alter function try_consume_ai_quota(int) security invoker;`)
    expect(failures(results)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('alter policy'), file: 'supabase/migrations/002_change.sql', line: 2 }),
      expect.objectContaining({ message: expect.stringContaining('alter function'), file: 'supabase/migrations/002_change.sql', line: 3 }),
    ])
  })

  it('fails when there are no migrations to read', async () => {
    const results = await runChecks({ root: createFixtureRepo(), checks: [rlsCheck] })
    expect(failures(results)).toHaveLength(1)
  })
})
