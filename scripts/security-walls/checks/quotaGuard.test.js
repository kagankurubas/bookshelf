import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { runChecks } from '../index.js'
import { createFixtureRepo } from '../test/fixtureRepo.js'
import { quotaGuard } from './quotaGuard.js'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const AI_CHAT = 'supabase/functions/ai-chat/index.ts'

const MIGRATION = `
create table if not exists ai_daily_usage (usage_date date primary key, request_count integer not null default 0);
alter table ai_daily_usage enable row level security;
create or replace function try_consume_ai_quota()
returns boolean language plpgsql security definer set search_path = public
as $$ begin return true; end; $$;
revoke execute on function try_consume_ai_quota() from public, anon, authenticated;
grant execute on function try_consume_ai_quota() to service_role;
`

const QUOTA = `
  const { data: quotaOk, error: quotaError } = await quotaClient.rpc('try_consume_ai_quota');
  if (quotaError) throw quotaError;
  if (!quotaOk) {
    // polite limit message
    return jsonResponse({ error: 'DAILY_LIMIT_REACHED' }, 200);
  }
`
const INSERT = `
  const { error } = await supabase.from('ai_messages').insert({ role: 'user', content: message });
  if (error) throw error;
`
const FETCH = `
  const geminiRes = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/\${GEMINI_MODEL}:generateContent\`, {
    method: 'POST',
  });
`
const handler = (...parts) => `Deno.serve(async (req) => {\n  try {\n${parts.join('')}\n  } catch (err) {\n    return jsonResponse({ error: String(err) }, 500);\n  }\n});\n`

async function run(files) {
  const root = createFixtureRepo({
    'supabase/migrations/001_quota.sql': MIGRATION,
    [AI_CHAT]: handler(QUOTA, INSERT, FETCH),
    ...files,
  })
  return runChecks({ root, checks: [quotaGuard], exceptions: {} })
}

const failures = (results) => results.filter((r) => r.status === 'fail')

describe('Gemini quota guard wall', () => {
  it('passes a guard that runs before any insert or Gemini fetch', async () => {
    const results = await run({})
    expect(failures(results)).toEqual([])
    expect(results.filter((r) => r.status === 'pass')).toHaveLength(4)
  })

  it('fails when the quota call is moved after the Gemini fetch', async () => {
    const results = failures(await run({ [AI_CHAT]: handler(FETCH, QUOTA, INSERT) }))
    expect(results).toEqual([
      expect.objectContaining({ file: AI_CHAT, message: expect.stringContaining('after the first fetch(') }),
    ])
  })

  it('fails when the quota call comes after the first insert', async () => {
    const results = failures(await run({ [AI_CHAT]: handler(INSERT, QUOTA, FETCH) }))
    expect(results).toEqual([expect.objectContaining({ message: expect.stringContaining('after the first .insert(') })])
  })

  it('fails when the !quotaOk early return is removed', async () => {
    const withoutReturn = QUOTA.replace(/ {2}if \(!quotaOk\) \{[\s\S]*?\n {2}\}\n/, '')
    const results = failures(await run({ [AI_CHAT]: handler(withoutReturn, INSERT, FETCH) }))
    expect(results).toEqual([expect.objectContaining({ file: AI_CHAT, message: expect.stringContaining('!quotaOk') })])
  })

  it('fails when quotaError is no longer thrown', async () => {
    const results = failures(await run({ [AI_CHAT]: handler(QUOTA.replace('if (quotaError) throw quotaError;', ''), INSERT, FETCH) }))
    expect(results).toEqual([expect.objectContaining({ message: expect.stringContaining('quotaError') })])
  })

  it('ignores a quota call that only survives in a comment', async () => {
    const commented = QUOTA.split('\n').map((line) => `// ${line}`).join('\n')
    const results = failures(await run({ [AI_CHAT]: handler(`/* ${commented} */`, INSERT, FETCH) }))
    expect(results).toEqual([expect.objectContaining({ message: expect.stringContaining("no rpc('try_consume_ai_quota'") })])
  })

  it('fails when the ai-chat function is missing', async () => {
    const root = createFixtureRepo({ 'supabase/migrations/001_quota.sql': MIGRATION })
    const results = failures(await runChecks({ root, checks: [quotaGuard], exceptions: {} }))
    expect(results).toEqual([expect.objectContaining({ message: expect.stringContaining('not found') })])
  })

  it('fails when a later migration drops security definer from the quota function', async () => {
    const results = failures(await run({
      'supabase/migrations/002_regress.sql': `
create or replace function try_consume_ai_quota()
returns boolean language plpgsql as $$ begin return true; end; $$;
`,
    }))
    expect(results).toEqual([
      expect.objectContaining({
        file: 'supabase/migrations/002_regress.sql',
        message: expect.stringContaining('security definer and set search_path'),
      }),
    ])
  })

  it('fails when the limit comes back as a caller-supplied parameter', async () => {
    const results = failures(await run({
      'supabase/migrations/002_regress.sql': `
drop function try_consume_ai_quota();
create function try_consume_ai_quota(p_max_requests integer)
returns boolean language plpgsql security definer set search_path = public as $$ begin return true; end; $$;
revoke execute on function try_consume_ai_quota(integer) from public, anon, authenticated;
`,
    }))
    expect(results).toEqual([
      expect.objectContaining({ file: 'supabase/migrations/002_regress.sql', message: expect.stringContaining('p_max_requests') }),
    ])
  })

  it('fails when a new signature is created without dropping the old one', async () => {
    const results = failures(await run({
      'supabase/migrations/001_quota.sql': `
create table if not exists ai_daily_usage (usage_date date primary key, request_count integer not null default 0);
alter table ai_daily_usage enable row level security;
create or replace function try_consume_ai_quota(p_usage_date date, p_max_requests integer)
returns boolean language plpgsql security definer set search_path = public as $$ begin return true; end; $$;
revoke execute on function try_consume_ai_quota(date, integer) from public, anon, authenticated;
`,
      'supabase/migrations/002_new.sql': `
create or replace function try_consume_ai_quota()
returns boolean language plpgsql security definer set search_path = public as $$ begin return true; end; $$;
revoke execute on function try_consume_ai_quota() from public, anon, authenticated;
`,
    }))
    expect(results).toEqual([
      expect.objectContaining({ message: expect.stringContaining('try_consume_ai_quota(p_usage_date date, p_max_requests integer) is still defined') }),
    ])
  })

  it('fails when a client role can still execute the quota function', async () => {
    const granted = failures(await run({
      'supabase/migrations/002_grant.sql': 'grant execute on function try_consume_ai_quota() to authenticated;',
    }))
    expect(granted).toEqual([expect.objectContaining({ message: expect.stringContaining('executable by authenticated') })])

    const neverRevoked = failures(await run({
      'supabase/migrations/001_quota.sql': MIGRATION.replace(/^revoke .*$/m, ''),
    }))
    expect(neverRevoked).toEqual([
      expect.objectContaining({ message: expect.stringContaining('executable by public, anon, authenticated') }),
    ])
  })

  it('fails when ai_daily_usage gets a policy or loses RLS', async () => {
    const withPolicy = failures(await run({
      'supabase/migrations/002_policy.sql': 'create policy "read usage" on ai_daily_usage for select using (true);',
    }))
    expect(withPolicy).toEqual([expect.objectContaining({ file: 'supabase/migrations/002_policy.sql', message: expect.stringContaining('read usage') })])

    const withoutRls = failures(await run({
      'supabase/migrations/002_rls.sql': 'alter table ai_daily_usage disable row level security;',
    }))
    expect(withoutRls).toEqual([expect.objectContaining({ message: expect.stringContaining('row level security') })])
  })

  it('passes on the real repo', async () => {
    const results = await runChecks({ root: repoRoot, checks: [quotaGuard] })
    expect(failures(results)).toEqual([])
    expect(results.some((r) => r.status === 'pass' && r.file === AI_CHAT)).toBe(true)
  })
})
