import { describe, expect, it } from 'vitest'
import { runChecks } from '../index.js'
import { createFixtureRepo } from '../test/fixtureRepo.js'
import { sqlInjection } from './sqlInjection.js'

const run = (files) => runChecks({ root: createFixtureRepo(files), checks: [sqlInjection] })
const failures = (results) => results.filter((r) => r.status === 'fail')

describe('SQL injection wall', () => {
  it('fails a hook passing a template literal to .or()', async () => {
    const results = await run({
      'src/hooks/useSearch.js': `
export async function search(supabase, term) {
  return supabase
    .from('books')
    .select('*')
    .or(\`title.ilike.%\${term}%,author.ilike.%\${term}%\`)
}
`,
    })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: 'src/hooks/useSearch.js', line: 3, message: expect.stringContaining('.or()') }),
    ])
  })

  it('fails .rpc() arguments built by string concatenation', async () => {
    const results = await run({
      'supabase/functions/stats/index.ts': `
const data = await supabase.rpc('get_stats', '{"p_year":' + year + '}')
`,
    })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: 'supabase/functions/stats/index.ts', line: 2, message: expect.stringContaining('.rpc()') }),
    ])
  })

  it('fails a migration building SQL with execute and ||', async () => {
    const results = await run({
      'supabase/migrations/001_dyn.sql': `
create function run_it(x text) returns void language plpgsql as $$
begin
  -- execute format('%I', x) is fine, but not the next line
  execute 'select ' || x;
end;
$$;
`,
    })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: 'supabase/migrations/001_dyn.sql', line: 5 }),
    ])
  })

  it('fails raw SQL paths, format(%s) and unparseable files', async () => {
    const results = await run({
      'src/lib/db.js': `
import postgres from 'npm:postgres@3'
const rows = await sql\`select * from books where id = \${id}\`
await client.query('select 1')
`,
      'supabase/functions/typed/index.ts': 'const n: number = 1\n',
      'supabase/migrations/001_fmt.sql': `
do $$ begin execute format('select %s', current_user); end $$;
`,
    })
    expect(failures(results).map((r) => [r.file, r.line])).toEqual([
      ['src/lib/db.js', 2],
      ['src/lib/db.js', 3],
      ['src/lib/db.js', 4],
      ['supabase/functions/typed/index.ts', 1],
      ['supabase/migrations/001_fmt.sql', 2],
    ])
  })

  it('does not flag Array.filter, safe PostgREST calls, safe execute or test files', async () => {
    const results = await run({
      'src/hooks/useBooks.js': `
const read = books.filter((b) => b.status === 'read')
const tagged = tags.filter((t) => t.startsWith(\`\${prefix}:\`))
const { data } = await supabase.rpc('get_reading_stats', { p_year: year })
const other = await supabase.rpc('get_reading_stats', args)
await supabase.from('books').select('*').not('rating', 'is', null).filter('status', 'eq', status)
`,
      'src/hooks/useBooks.test.js': 'await client.query(`select ${x}`)\n',
      'supabase/migrations/001_safe.sql': `
create function f(t text) returns void language plpgsql as $$
begin
  raise notice 'never execute ' || t;
  execute format('select %I from %L', t, t);
end;
$$;
grant execute on function f(text) to authenticated;
`,
    })
    expect(results).toEqual([expect.objectContaining({ status: 'pass' })])
  })
})
