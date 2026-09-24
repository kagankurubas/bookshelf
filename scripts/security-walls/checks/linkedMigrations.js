// Wall 4: production migration history and policies, read-only, only with
// --linked. Every Supabase CLI call goes through the allow-list below.
import { spawnSync } from 'node:child_process'
import { expectedPolicies, policyProblems } from './rls.js'

export const VERSIONS_QUERY = 'select version from supabase_migrations.schema_migrations order by version'
export const POLICIES_QUERY =
  "select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, policyname"

const dbQuery = (sql) => ['db', 'query', '--linked', '--output', 'json', sql]

// The only Supabase CLI invocations this script may ever run, matched exactly.
export const ALLOWED_COMMANDS = Object.freeze([dbQuery(VERSIONS_QUERY), dbQuery(POLICIES_QUERY)].map(Object.freeze))

const HOW_TO_LINK = 'run `npx supabase login` and `npx supabase link --project-ref <ref>` first'

export function assertAllowed(args) {
  const allowed = ALLOWED_COMMANDS.some(
    (command) => Array.isArray(args) && command.length === args.length && command.every((part, i) => part === args[i]),
  )
  if (!allowed) throw new Error(`refusing to run a Supabase CLI command that is not allow-listed: supabase ${[].concat(args).join(' ')}`)
}

// Only reached when ctx.linked is true. On Windows `npx` is a .cmd shim that
// needs a shell; allow-listed arguments contain no double quotes to escape.
export function defaultRunner(args, { cwd }) {
  assertAllowed(args)
  const windows = process.platform === 'win32'
  const argv = ['--yes', 'supabase', ...args]
  const child = spawnSync(windows ? 'npx.cmd' : 'npx', windows ? argv.map((arg) => `"${arg}"`) : argv, {
    cwd,
    encoding: 'utf8',
    shell: windows,
    timeout: 120000,
  })
  return { code: child.error ? null : child.status, stdout: child.stdout ?? '', stderr: `${child.stderr ?? ''}${child.error?.message ?? ''}` }
}

class CliUnavailable extends Error {}

async function query(runner, sql, cwd) {
  const args = dbQuery(sql)
  assertAllowed(args)
  let result
  try {
    result = await runner(args, { cwd })
  } catch (error) {
    throw new CliUnavailable(`Supabase CLI could not be started (${error?.message ?? error}); install it and ${HOW_TO_LINK}`)
  }
  if (result?.code !== 0) {
    const detail = `${result?.stderr ?? ''}`.trim().split('\n').pop()
    throw new CliUnavailable(`\`supabase ${args.slice(0, 3).join(' ')}\` failed${detail ? ` (${detail})` : ''}; ${HOW_TO_LINK}`)
  }
  return parseRows(result.stdout)
}

// Accepts a bare JSON array of rows or an object with a `rows` array, with
// any non-JSON noise (warnings, banners) before or after it.
export function parseRows(stdout) {
  const text = `${stdout ?? ''}`
  const starts = [text.indexOf('['), text.indexOf('{')].filter((i) => i !== -1)
  if (starts.length === 0) throw new Error('no JSON found in Supabase CLI output')
  const start = Math.min(...starts)
  const ends = [text.lastIndexOf(']'), text.lastIndexOf('}')].filter((i) => i > start).sort((a, b) => b - a)
  for (const end of ends) {
    let parsed
    try {
      parsed = JSON.parse(text.slice(start, end + 1))
    } catch {
      continue
    }
    const rows = Array.isArray(parsed) ? parsed : parsed?.rows
    if (Array.isArray(rows)) return rows
  }
  throw new Error('could not parse Supabase CLI output as JSON rows')
}

const localVersion = (file) => /^(\d+)_/.exec(file.split('/').pop())?.[1]

function compareVersions(ctx, rows) {
  const local = new Map()
  for (const file of ctx.migrations.files) {
    const version = localVersion(file)
    if (version) local.set(version, file)
  }
  const remote = new Set(rows.map((row) => String(row.version)))
  const results = []
  for (const [version, file] of local) {
    if (!remote.has(version)) {
      results.push({ status: 'fail', message: `migration ${version} is not recorded in production schema_migrations`, file })
    }
  }
  for (const version of remote) {
    if (!local.has(version)) {
      results.push({ status: 'fail', message: `production schema_migrations has version ${version}, which no local migration file has` })
    }
  }
  if (results.length === 0) results.push({ status: 'pass', message: `${local.size} migration versions match production schema_migrations` })
  return results
}

function comparePolicies(ctx, rows) {
  const expected = expectedPolicies(ctx)
  const remote = new Map(rows.map((row) => [`${row.tablename}:${row.policyname}`, row]))
  const results = []
  const fail = (message, file, line) => results.push({ status: 'fail', message, file, line })
  for (const policy of expected) {
    const row = remote.get(`${policy.table}:${policy.name}`)
    if (!row) {
      fail(`policy "${policy.name}" on ${policy.table} is missing in production pg_policies`, policy.file, policy.line)
      continue
    }
    for (const problem of policyProblems({ ...policy, using: row.qual ?? null, withCheck: row.with_check ?? null })) {
      fail(`production policy "${policy.name}" on ${policy.table}: ${problem}`, policy.file, policy.line)
    }
  }
  const expectedKeys = new Set(expected.map((policy) => `${policy.table}:${policy.name}`))
  for (const [key, row] of remote) {
    if (!expectedKeys.has(key)) fail(`production has policy "${row.policyname}" on ${row.tablename}, which the migrations do not define`)
  }
  if (results.length === 0) results.push({ status: 'pass', message: `${expected.length} policies match production pg_policies` })
  return results
}

export function createLinkedMigrationsCheck({ runner = defaultRunner } = {}) {
  return {
    id: 'linked-migrations',
    title: 'Wall 4: production migration history (--linked)',
    async run(ctx) {
      if (!ctx.linked) return [{ status: 'skip', message: 'use --linked for the production check' }]
      try {
        const versions = await query(runner, VERSIONS_QUERY, ctx.root)
        const policies = await query(runner, POLICIES_QUERY, ctx.root)
        return [...compareVersions(ctx, versions), ...comparePolicies(ctx, policies)]
      } catch (error) {
        if (error instanceof CliUnavailable) return [{ status: 'skip', message: error.message }]
        throw error
      }
    },
  }
}

export const linkedMigrations = createLinkedMigrationsCheck()
